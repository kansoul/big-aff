<?php

namespace App\Services\Integrations\TikTok;

use App\Models\TikTokOAuthToken;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Write-side client for the TikTok Business (Marketing) API: enables or pauses
 * campaigns, ad groups (adsets) and ads.
 *
 * TikTok exposes plain JSON REST endpoints, so we use Laravel's HTTP client
 * instead of an SDK, mirroring TikTokAdsService. The system-wide ACTIVE/PAUSED
 * vocabulary is translated to TikTok's ENABLE/DISABLE operation_status here so
 * callers never have to think about the platform-specific values.
 */
class TikTokAdsStatusService
{
    private const CAMPAIGN_STATUS_PATH = '/campaign/status/update/';

    private const ADGROUP_STATUS_PATH = '/adgroup/status/update/';

    private const AD_STATUS_PATH = '/ad/status/update/';

    private string $baseUrl;

    private ?string $accessToken;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('tiktok.base_url'), '/');
        $this->accessToken = TikTokOAuthToken::getActiveToken()?->access_token;
    }

    /**
     * @param  array<int, string>  $campaignIds
     */
    public function updateCampaignStatus(string $advertiserId, array $campaignIds, string $status): bool
    {
        return $this->updateStatus(self::CAMPAIGN_STATUS_PATH, $advertiserId, 'campaign_ids', $campaignIds, $status);
    }

    /**
     * @param  array<int, string>  $adgroupIds
     */
    public function updateAdgroupStatus(string $advertiserId, array $adgroupIds, string $status): bool
    {
        return $this->updateStatus(self::ADGROUP_STATUS_PATH, $advertiserId, 'adgroup_ids', $adgroupIds, $status);
    }

    /**
     * @param  array<int, string>  $adIds
     */
    public function updateAdStatus(string $advertiserId, array $adIds, string $status): bool
    {
        return $this->updateStatus(self::AD_STATUS_PATH, $advertiserId, 'ad_ids', $adIds, $status);
    }

    /**
     * @param  array<int, string>  $ids
     */
    private function updateStatus(string $path, string $advertiserId, string $idsKey, array $ids, string $status): bool
    {
        $ids = array_values(array_filter(array_map('strval', $ids), fn (string $id): bool => $id !== ''));

        if (empty($ids)) {
            return false;
        }

        try {
            $response = $this->client()->post($this->baseUrl.$path, [
                'advertiser_id' => $advertiserId,
                $idsKey => $ids,
                'operation_status' => $this->mapStatus($status),
            ]);

            $json = $response->json();

            if (! is_array($json) || (int) ($json['code'] ?? -1) !== 0) {
                Log::error('[TikTokAdsStatusService] status update failed', [
                    'path' => $path,
                    'advertiser_id' => $advertiserId,
                    $idsKey => $ids,
                    'code' => is_array($json) ? ($json['code'] ?? null) : null,
                    'message' => is_array($json) ? ($json['message'] ?? null) : null,
                ]);

                return false;
            }

            return true;
        } catch (Throwable $e) {
            Log::error('[TikTokAdsStatusService] status update threw: '.$e->getMessage().' - '.$advertiserId.' - '.$path);

            return false;
        }
    }

    private function client(): PendingRequest
    {
        return Http::withHeaders([
            'Access-Token' => (string) $this->accessToken,
        ])->timeout(30)->retry(2, 1000);
    }

    /**
     * Translate the system-wide ACTIVE/PAUSED vocabulary onto TikTok's
     * ENABLE/DISABLE operation_status.
     */
    private function mapStatus(string $status): string
    {
        return $status === 'ACTIVE' ? 'ENABLE' : 'DISABLE';
    }
}

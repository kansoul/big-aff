<?php

namespace App\Services\Integrations\TikTok;

use App\Enums\AdsType;
use App\Models\Account;
use Carbon\Carbon;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Thin REST client for the TikTok Business (Marketing) API.
 *
 * Mirrors the surface of GoogleAdsService: a single getCampaignInsights() call
 * returns both the daily campaign insights and the campaigns referenced by
 * them, ready for upsert. TikTok exposes a plain JSON REST API, so we use
 * Laravel's HTTP client instead of an SDK.
 */
class TikTokAdsService
{
    private const REPORT_PATH = '/report/integrated/get/';

    private const CAMPAIGN_PATH = '/campaign/get/';

    private const PAGE_SIZE = 1000;

    private string $baseUrl;

    private ?string $accessToken;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('tiktok.base_url'), '/');
        $this->accessToken = config('tiktok.sync_tokens.access_token');
    }

    /**
     * Fetch daily campaign insights and the referenced campaigns for an
     * advertiser within a date range.
     *
     * Returns ['insights' => [...], 'campaigns' => [...]] where insight rows are
     * already normalised to the insight_reports schema (Facebook-specific
     * columns are null for TikTok). Returns null on API failure so the caller
     * can skip the advertiser.
     *
     * @return array{insights: array<int, array<string, mixed>>, campaigns: array<int, array<string, mixed>>}|null
     */
    public function getCampaignInsights(string $advertiserId, string $start, string $end): ?array
    {
        $insights = $this->fetchInsights($advertiserId, $start, $end);
        if ($insights === null) {
            return null;
        }

        if (empty($insights)) {
            return ['insights' => [], 'campaigns' => []];
        }

        $campaigns = $this->fetchCampaigns($advertiserId, $insights);
        if ($campaigns === null) {
            return null;
        }

        return ['insights' => $insights, 'campaigns' => $campaigns];
    }

    /**
     * Verify that a campaign exists on TikTok and return its data so the caller
     * can persist it locally. Mirrors GoogleAdsService::verifyCampaign: because
     * the TikTok API requires an advertiser_id, we probe each candidate
     * advertiser (from the ads link's tracking ids) until the campaign is found.
     * The owning advertiser account is created locally if missing. Returns null
     * when the campaign is not found on any advertiser.
     *
     * @param  array<int, string>  $advertiserIds
     * @return array<string, mixed>|null
     */
    public function verifyCampaign(string $campaignId, array $advertiserIds): ?array
    {
        foreach ($advertiserIds as $advertiserId) {
            $advertiserId = trim((string) $advertiserId);
            if ($advertiserId === '') {
                continue;
            }

            try {
                $response = $this->client()->get($this->baseUrl.self::CAMPAIGN_PATH, [
                    'advertiser_id' => $advertiserId,
                    'filtering' => json_encode(['campaign_ids' => [$campaignId]]),
                    'fields' => json_encode([
                        'campaign_id', 'campaign_name', 'budget', 'budget_mode',
                        'operation_status', 'create_time', 'modify_time',
                    ]),
                    'page' => 1,
                    'page_size' => 1,
                ]);

                $payload = $this->decode($response->json(), $advertiserId, 'verifyCampaign');
                if ($payload === null) {
                    continue;
                }

                $campaign = ($payload['list'] ?? [])[0] ?? null;
                if (! $campaign) {
                    continue;
                }

                $budgetMode = $campaign['budget_mode'] ?? null;
                $budget = $this->toFloat($campaign['budget'] ?? null);

                if (! Account::where('account_id', $advertiserId)->exists()) {
                    Account::firstOrCreate(
                        ['account_id' => $advertiserId],
                        [
                            'account_name' => $advertiserId,
                            'ads_type' => AdsType::TIKTOK->value,
                            'status' => 'ACTIVE',
                        ],
                    );
                }

                return [
                    'account_id' => $advertiserId,
                    'campaign_id' => (string) ($campaign['campaign_id'] ?? $campaignId),
                    'name' => $campaign['campaign_name'] ?? null,
                    'ads_type' => AdsType::TIKTOK->value,
                    'daily_budget' => $budgetMode === 'BUDGET_MODE_DAY' ? $budget : null,
                    'lifetime_budget' => $budgetMode === 'BUDGET_MODE_TOTAL' ? $budget : null,
                    'status' => $this->mapStatus($campaign['operation_status'] ?? null),
                    'start_time' => null,
                    'stop_time' => null,
                    'created_time' => $this->toDateTime($campaign['create_time'] ?? null),
                    'updated_time' => $this->toDateTime($campaign['modify_time'] ?? null),
                ];
            } catch (Throwable $e) {
                Log::error('[TikTokAdsService] verifyCampaign failed: '.$e->getMessage().' - '.$campaignId.' - '.$advertiserId);

                continue;
            }
        }

        return null;
    }

    /**
     * @return array<int, array<string, mixed>>|null
     */
    private function fetchInsights(string $advertiserId, string $start, string $end): ?array
    {
        try {
            $rows = [];
            $page = 1;

            do {
                $response = $this->client()->get($this->baseUrl.self::REPORT_PATH, [
                    'advertiser_id' => $advertiserId,
                    'report_type' => 'BASIC',
                    'data_level' => 'AUCTION_CAMPAIGN',
                    'dimensions' => json_encode(['campaign_id', 'stat_time_day']),
                    'metrics' => json_encode([
                        'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm',
                        'reach', 'frequency', 'conversion', 'cost_per_conversion',
                    ]),
                    'start_date' => $start,
                    'end_date' => $end,
                    'page' => $page,
                    'page_size' => self::PAGE_SIZE,
                ]);

                $payload = $this->decode($response->json(), $advertiserId, 'insights');
                if ($payload === null) {
                    return null;
                }

                foreach (($payload['list'] ?? []) as $item) {
                    $dimensions = $item['dimensions'] ?? [];
                    $metrics = $item['metrics'] ?? [];

                    $rows[] = [
                        'account_id' => $advertiserId,
                        'campaign_id' => (string) ($dimensions['campaign_id'] ?? ''),
                        'date_start' => $this->toDate($dimensions['stat_time_day'] ?? null),
                        'impressions' => $this->toInt($metrics['impressions'] ?? null),
                        'clicks' => $this->toInt($metrics['clicks'] ?? null),
                        'reach' => $this->toInt($metrics['reach'] ?? null),
                        'ad_clicks' => $this->toInt($metrics['clicks'] ?? null),
                        'cpa' => $this->toFloat($metrics['cost_per_conversion'] ?? null),
                        'spend' => $this->toFloat($metrics['spend'] ?? null),
                        'cpc' => $this->toFloat($metrics['cpc'] ?? null),
                        'cpm' => $this->toFloat($metrics['cpm'] ?? null),
                        'ctr' => $this->toFloat($metrics['ctr'] ?? null),
                        'frequency' => $this->toFloat($metrics['frequency'] ?? null),
                        // Columns specific to Facebook insights — not available on TikTok.
                        'search_clicks' => null,
                        'ctr_link' => null,
                        'cpc_link' => null,
                        'article_views' => null,
                        'search_views' => null,
                        'spend_type' => null,
                    ];
                }

                $totalPage = (int) ($payload['page_info']['total_page'] ?? 1);
                $page++;
            } while ($page <= $totalPage);

            return $rows;
        } catch (Throwable $e) {
            Log::error('[TikTokAdsService] fetchInsights failed: '.$e->getMessage().' - '.$advertiserId);

            return null;
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $insights
     * @return array<int, array<string, mixed>>|null
     */
    private function fetchCampaigns(string $advertiserId, array $insights): ?array
    {
        $campaignIds = array_values(array_unique(array_filter(array_column($insights, 'campaign_id'))));

        if (empty($campaignIds)) {
            return [];
        }

        try {
            $campaigns = [];
            $page = 1;

            do {
                $response = $this->client()->get($this->baseUrl.self::CAMPAIGN_PATH, [
                    'advertiser_id' => $advertiserId,
                    'filtering' => json_encode(['campaign_ids' => $campaignIds]),
                    'fields' => json_encode([
                        'campaign_id', 'campaign_name', 'budget', 'budget_mode',
                        'operation_status', 'create_time', 'modify_time',
                    ]),
                    'page' => $page,
                    'page_size' => self::PAGE_SIZE,
                ]);

                $payload = $this->decode($response->json(), $advertiserId, 'campaigns');
                if ($payload === null) {
                    return null;
                }

                foreach (($payload['list'] ?? []) as $campaign) {
                    $budgetMode = $campaign['budget_mode'] ?? null;
                    $budget = $this->toFloat($campaign['budget'] ?? null);

                    $campaigns[] = [
                        'account_id' => $advertiserId,
                        'campaign_id' => (string) ($campaign['campaign_id'] ?? ''),
                        'campaign_name' => $campaign['campaign_name'] ?? null,
                        'ads_type' => AdsType::TIKTOK->value,
                        'daily_budget' => $budgetMode === 'BUDGET_MODE_DAY' ? $budget : null,
                        'lifetime_budget' => $budgetMode === 'BUDGET_MODE_TOTAL' ? $budget : null,
                        'status' => $this->mapStatus($campaign['operation_status'] ?? null),
                        'start_time' => null,
                        'stop_time' => null,
                        'created_time' => $this->toDateTime($campaign['create_time'] ?? null),
                        'updated_time' => $this->toDateTime($campaign['modify_time'] ?? null),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }

                $totalPage = (int) ($payload['page_info']['total_page'] ?? 1);
                $page++;
            } while ($page <= $totalPage);

            return $campaigns;
        } catch (Throwable $e) {
            Log::error('[TikTokAdsService] fetchCampaigns failed: '.$e->getMessage().' - '.$advertiserId);

            return null;
        }
    }

    private function client(): PendingRequest
    {
        return Http::withHeaders([
            'Access-Token' => (string) $this->accessToken,
        ])->timeout(60)->retry(2, 1000);
    }

    /**
     * Unwrap the TikTok envelope. A non-zero `code` means the request failed;
     * we log and return null so the caller treats the advertiser as failed.
     *
     * @param  mixed  $json
     * @return array<string, mixed>|null
     */
    private function decode($json, string $advertiserId, string $context): ?array
    {
        if (! is_array($json)) {
            Log::error("[TikTokAdsService] Empty/invalid response for {$context} - {$advertiserId}");

            return null;
        }

        if ((int) ($json['code'] ?? -1) !== 0) {
            Log::error("[TikTokAdsService] API error for {$context} - {$advertiserId}", [
                'code' => $json['code'] ?? null,
                'message' => $json['message'] ?? null,
            ]);

            return null;
        }

        return $json['data'] ?? [];
    }

    /**
     * Map TikTok operation_status onto the ACTIVE/PAUSED vocabulary the rest of
     * the system (campaign rules, reports) already expects.
     */
    private function mapStatus(?string $operationStatus): string
    {
        return $operationStatus === 'ENABLE' ? 'ACTIVE' : 'PAUSED';
    }

    private function toDate(?string $value): ?string
    {
        if (empty($value)) {
            return null;
        }

        return Carbon::parse($value)->toDateString();
    }

    private function toDateTime(?string $value): ?Carbon
    {
        return empty($value) ? null : Carbon::parse($value);
    }

    private function toInt(mixed $value): ?int
    {
        return $value === null || $value === '' ? null : (int) $value;
    }

    private function toFloat(mixed $value): ?float
    {
        return $value === null || $value === '' ? null : (float) $value;
    }
}

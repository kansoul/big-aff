<?php

namespace App\Services\Integrations\Ads;

use App\Enums\AdsType;
use App\Models\Account;
use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
use App\Models\Campaign;
use App\Services\Integrations\Google\GoogleAdsService;
use App\Services\Integrations\TikTok\TikTokAdsStatusService;
use Illuminate\Support\Facades\Log;

class AdsStatusService
{
    public function __construct(
        public readonly GoogleAdsService $google,
        public readonly TikTokAdsStatusService $tiktok,
    ) {}

    public function updateCampaignStatus(string $campaignId, string $status, bool $canChangeGoogle = false): bool
    {
        $campaign = Campaign::where('campaign_id', $campaignId)->first();

        if ($campaign && $campaign->ads_type === 'google' && $canChangeGoogle) {
            return $this->google->updateCampaignStatus($campaign->account_id, $campaignId, $status);
        }

        if ($campaign && $campaign->ads_type === AdsType::TIKTOK->value) {
            return $this->tiktok->updateCampaignStatus((string) $campaign->account_id, [$campaignId], $status);
        }

        Log::warning('Unsupported campaign provider for status update', ['campaign_id' => $campaignId]);

        return false;
    }

    /**
     * Update a campaign's target CPA. Only supported for Google campaigns.
     */
    public function updateCampaignTargetCpa(string $campaignId, float $targetCpa): bool
    {
        $campaign = Campaign::where('campaign_id', $campaignId)->first();

        if ($campaign && $campaign->ads_type === 'google') {
            return $this->google->updateCampaignTargetCpa(
                $campaign->account_id,
                $campaignId,
                $targetCpa,
                $campaign->bidding_strategy_type,
                $campaign->target_cpa
            );
        }

        Log::warning('Target CPA update is only supported for Google campaigns: '.$campaignId);

        return false;
    }

    public function updateAdsetStatus(string $adsetId, string $status): bool
    {
        $accountId = AdsetInsightsReport::where('adset_id', $adsetId)->value('account_id');

        if ($this->isTikTokAccount($accountId)) {
            return $this->tiktok->updateAdgroupStatus((string) $accountId, [$adsetId], $status);
        }

        Log::warning('Unsupported adset provider for status update', ['adset_id' => $adsetId]);

        return false;
    }

    public function updateAdStatus(string $adId, string $status): bool
    {
        $accountId = AdsInsightsReport::where('ad_id', $adId)->value('account_id');

        if ($this->isTikTokAccount($accountId)) {
            return $this->tiktok->updateAdStatus((string) $accountId, [$adId], $status);
        }

        Log::warning('Unsupported ad provider for status update', ['ad_id' => $adId]);

        return false;
    }

    /**
     * Whether the given advertiser account belongs to TikTok.
     */
    private function isTikTokAccount(?string $accountId): bool
    {
        if ($accountId === null || $accountId === '') {
            return false;
        }

        return Account::where('account_id', $accountId)->value('ads_type') === AdsType::TIKTOK->value;
    }
}

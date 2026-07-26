<?php

namespace App\Services\Integrations\Ads;

use App\Enums\AdsType;
use App\Models\Account;
use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
use App\Models\Campaign;
use App\Services\Integrations\Google\GoogleAdsService;
use App\Services\Integrations\TikTok\TikTokAdsStatusService;
use Exception;
use FacebookAds\Api;
use FacebookAds\Http\Exception\AuthorizationException;
use FacebookAds\Object\Ad;
use FacebookAds\Object\AdSet;
use FacebookAds\Object\Campaign as FacebookCampaign;
use Illuminate\Support\Facades\Log;

class AdsStatusService
{
    protected string $accessToken;

    protected string $appSecret;

    protected string $appId;

    public function __construct(
        public readonly GoogleAdsService $google,
        public readonly TikTokAdsStatusService $tiktok,
    ) {
        $this->accessToken = config('facebook.facebook_ads_update.access_token');
        $this->appSecret = config('facebook.facebook_ads_update.app_secret');
        $this->appId = config('facebook.facebook_ads_update.app_id');

        Api::init($this->appId, $this->appSecret, $this->accessToken);
    }

    public function updateCampaignStatus(string $campaignId, string $status, bool $canChangeGoogle = false): bool
    {
        $campaign = Campaign::where('campaign_id', $campaignId)->first();

        if ($campaign && $campaign->ads_type === 'google' && $canChangeGoogle) {
            return $this->google->updateCampaignStatus($campaign->account_id, $campaignId, $status);
        }

        if ($campaign && $campaign->ads_type === AdsType::TIKTOK->value) {
            return $this->tiktok->updateCampaignStatus((string) $campaign->account_id, [$campaignId], $status);
        }

        try {
            $fbCampaign = new FacebookCampaign($campaignId);
            $fbCampaign->setData(['status' => $status]);
            $fbCampaign->update();

            return true;
        } catch (Exception $e) {
            Log::error('Error updating campaign status: '.$e->getMessage().' - '.$campaignId.' - '.$status);

            return false;
        }
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

        try {
            $adset = new AdSet($adsetId);
            $adset->setData(['status' => $status]);
            $adset->update();

            return true;
        } catch (AuthorizationException $e) {
            Log::error('Error updating adset status: '.$e->getMessage().' - '.$adsetId.' - '.$status.' - '.$e->getResponse()->getBody());

            return false;
        }
    }

    public function updateAdStatus(string $adId, string $status): bool
    {
        $accountId = AdsInsightsReport::where('ad_id', $adId)->value('account_id');

        if ($this->isTikTokAccount($accountId)) {
            return $this->tiktok->updateAdStatus((string) $accountId, [$adId], $status);
        }

        try {
            $ad = new Ad($adId);
            $ad->setData(['status' => $status]);
            $ad->update();

            return true;
        } catch (AuthorizationException $e) {
            Log::error('Error updating ad status: '.$e->getMessage().' - '.$adId.' - '.$status.' - '.$e->getResponse()->getBody());

            return false;
        }
    }

    /**
     * Whether the given advertiser account belongs to TikTok, so status writes
     * are routed to the TikTok API instead of the Facebook SDK default.
     */
    private function isTikTokAccount(?string $accountId): bool
    {
        if ($accountId === null || $accountId === '') {
            return false;
        }

        return Account::where('account_id', $accountId)->value('ads_type') === AdsType::TIKTOK->value;
    }
}

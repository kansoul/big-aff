<?php

namespace App\Services\Integrations\Ads;

use App\Models\Campaign;
use App\Services\Integrations\Google\GoogleAdsService;
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
            return $this->google->updateCampaignTargetCpa($campaign->account_id, $campaignId, $targetCpa);
        }

        Log::warning('Target CPA update is only supported for Google campaigns: '.$campaignId);

        return false;
    }

    public function updateAdsetStatus(string $adsetId, string $status): bool
    {
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
}

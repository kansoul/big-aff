<?php

namespace App\Actions\Post;

use App\Enums\PostStatus;
use App\Enums\TrafficType;
use App\Models\AdsLink;
use App\Models\Campaign;
use App\Models\LinkData;
use App\Models\Post;
use App\Services\Integrations\Facebook\FacebookAdsService;
use App\Services\Integrations\Google\GoogleAdsService;
use Illuminate\Support\Facades\Log;

class GetPostBySlugAction
{
    /**
     * Get post by slug
     */
    public function execute(string $slug, array $filters): ?Post
    {
        try {
            $campaignId = $filters['campaign_id'] ?? null;
            $tt = $filters['tt'] ?? null;

            $isAdsLink = (bool) preg_match('/-\d{5}$/', $slug);
            $cleanSlug = preg_replace('/-\d{5}$/', '', $slug);

            $post = null;
            if (! $isAdsLink) {
                return Post::with('featureMedia')
                    ->where('status', PostStatus::PUBLISHED)
                    ->where('slug', $cleanSlug)
                    ->first();
            }

            $adsLink = null;
            if ($isAdsLink) {
                $adsLink = AdsLink::with('post.featureMedia', 'keywordSet')->where('slug', $slug)->first();
                if (! $adsLink) {
                    Log::channel('getpost')->warning('AdsLink not found for slug', [
                        'slug' => $slug,
                    ]);

                    return null;
                }
            }
            $post = $adsLink->post;
            $post->rac = $adsLink->rac;
            $post->keyword_sets = $adsLink->keywordSet->keywords ?? [];
            $post->style = $adsLink->style_code;
            $post->channel = $adsLink->channel_code;

            $trackingIds = is_array($adsLink->tracking_ids) ? $adsLink->tracking_ids : (json_decode($adsLink->tracking_ids ?? '{}', true) ?: []);
            $post->fbid = implode(',', $trackingIds['fbid'] ?? []);
            $post->ggid = implode(',', $trackingIds['googleid'] ?? []);

            $campaign = null;
            if ($campaignId) {
                $trafficType = $tt ? TrafficType::tryFrom($tt) : null;
                $campaign = $this->getOrCreateCampaign($campaignId, $trafficType, $adsLink);
            }

            if ($campaign && $adsLink) {
                $linkData = $this->getOrCreateLinkData($campaign->campaign_id, $adsLink);
                if ($linkData) {
                    $post->style = $linkData->style_code;
                    $post->channel = $linkData->channel_code;
                }
                $post->campaign_id = $campaign->campaign_id;
                if ($trafficType === TrafficType::GOOGLE) {
                    $post->account_id = $campaign->account_id;
                }
            }

            return $post;
        } catch (\Throwable $th) {
            Log::channel('getpost')->error('Error getting post by slug', [
                'slug' => $slug,
                'error' => $th->getMessage(),
                'trace' => $th->getTraceAsString(),
            ]);

            return null;
        }
    }

    /**
     * Get or create campaign in local database
     */
    private function getOrCreateCampaign(string $campaignId, ?TrafficType $trafficType, AdsLink $adsLink): ?Campaign
    {
        $campaign = Campaign::where('campaign_id', $campaignId)->first();

        if ($campaign) {
            return $campaign;
        }

        $campaignData = null;

        $trackingIds = is_array($adsLink->tracking_ids) ? $adsLink->tracking_ids : (json_decode($adsLink->tracking_ids ?? '{}', true) ?: []);

        if ($trafficType === TrafficType::GOOGLE) {
            $googleIds = $trackingIds['googleid'] ?? [];
            if (! empty($googleIds)) {
                $googleAdsService = app(GoogleAdsService::class);
                $campaignData = $googleAdsService->verifyCampaign($campaignId, $googleIds);
            } else {
                return null;
            }
        } elseif ($trafficType === TrafficType::FACEBOOK) {
            $facebookAdsService = app(FacebookAdsService::class);
            $campaignData = $facebookAdsService->verifyCampaign($campaignId, true, $adsLink);
        } elseif ($trafficType === null && $adsLink->is_old) {
            $facebookAdsService = app(FacebookAdsService::class);
            $campaignData = $facebookAdsService->verifyCampaign($campaignId, true, $adsLink);

            if (! $campaignData) {
                $googleIds = $trackingIds['googleid'] ?? [];
                if (! empty($googleIds)) {
                    $googleAdsService = app(GoogleAdsService::class);
                    $campaignData = $googleAdsService->verifyCampaign($campaignId, $googleIds);
                }
            }
        }

        if (! $campaignData) {
            return null;
        }

        $now = now();

        return Campaign::updateOrCreate(
            [
                'campaign_id' => $campaignId,
            ],
            [
                'account_id' => $campaignData['account_id'],
                'campaign_name' => $campaignData['name'],
                'ads_type' => $campaignData['ads_type'],
                'start_time' => $campaignData['start_time'],
                'stop_time' => $campaignData['stop_time'],
                'daily_budget' => $campaignData['daily_budget'],
                'lifetime_budget' => $campaignData['lifetime_budget'],
                'status' => $campaignData['status'],
                'updated_at' => $now,
            ]
        );
    }

    /**
     * Get or create link data in local database
     */
    private function getOrCreateLinkData(string $campaignId, AdsLink $adsLink): LinkData
    {
        return LinkData::firstOrCreate(
            ['campaign_id' => $campaignId],
            [
                'ads_link_id' => $adsLink->id,
                'style_code' => $adsLink->style_code,
                'channel_code' => $adsLink->channel_code,
            ]
        );
    }
}

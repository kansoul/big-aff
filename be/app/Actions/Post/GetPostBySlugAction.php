<?php

namespace App\Actions\Post;

use App\Enums\AdsType;
use App\Enums\PostStatus;
use App\Enums\TrafficType;
use App\Models\AdsLink;
use App\Models\Campaign;
use App\Models\LinkData;
use App\Models\Post;
use App\Services\Google\GoogleAdsService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Log;

class GetPostBySlugAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(string $slug, ?string $campaignId, ?string $tt): ?Post
    {
        try {
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

        $trackingIds = is_array($adsLink->tracking_ids) ? $adsLink->tracking_ids : (json_decode($adsLink->tracking_ids ?? '{}', true) ?: []);
        $accountId = null;
        $campaignName = null;
        $adsType = $trafficType === TrafficType::GOOGLE ? AdsType::GOOGLE : ($trafficType === TrafficType::FACEBOOK ? AdsType::FACEBOOK : AdsType::UNKNOWN);

        if ($trafficType === TrafficType::GOOGLE) {
            $googleIds = $trackingIds['googleid'] ?? [];
            if (! empty($googleIds)) {
                $googleAdsService = app(GoogleAdsService::class);
                $googleCampaignData = $googleAdsService->verifyCampaign($campaignId, $googleIds);

                if ($googleCampaignData) {
                    $accountId = $googleCampaignData['account_id'];
                    $campaignName = $googleCampaignData['name'];
                } else {
                    return null;
                }
            } else {
                return null;
            }
        }

        $now = now();

        return Campaign::updateOrCreate(
            [
                'campaign_id' => $campaignId,
            ],
            [
                'account_id' => $accountId,
                'campaign_name' => $campaignName,
                'ads_type' => $adsType,
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

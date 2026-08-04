<?php

namespace App\Http\Resources;

use App\Models\CampaignReport;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CampaignReport
 */
class CampaignReportResource extends JsonResource
{
    private function buildAdsManagerLink(): ?string
    {
        $adsType = strtolower((string) ($this->ads_type ?? ''));
        if ($adsType !== 'google') {
            return null;
        }

        $campaignId = (string) ($this->campaign_id ?? '');

        if ($campaignId === '') {
            return null;
        }

        return 'https://ads.google.com/aw/campaigns?campaignId='.$campaignId;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $spend = (float) ($this->a_spend ?? 0);
        $estimateEarning = (float) ($this->estimate_earning ?? 0);
        $profit = (float) ($this->profit ?? $estimateEarning - $spend);
        $roi = (float) ($this->roi ?? ($spend > 0 ? ($profit / $spend) * 100 : 0.0));

        $rtClickAdCount = (float) ($this->realtimeReport?->click_ad_count ?? 0);
        $rtViewSearchCount = (float) ($this->realtimeReport?->view_search_count ?? 0);

        return [
            'id' => $this->id,
            'date_start' => $this->date_start?->format('Y-m-d'),
            'realtime_report_id' => $this->realtime_report_id,

            'account_id' => $this->account_id,
            'account_name' => $this->account_name,
            'user_email' => $this->user_email,
            'campaign_id' => $this->campaign_id,
            'adset_id' => $this->adset_id,
            'ad_id' => $this->ad_id,
            'session_id' => $this->session_id,
            'click_id' => $this->click_id === null ? null : (int) $this->click_id,
            'campaign_name' => $this->campaign_name,
            'campaign_status' => $this->campaign_status,
            'has_rule' => (bool) ($this->has_rule ?? false),
            'ads_type' => $this->ads_type,
            'site_url' => $this->campaign?->adsLink?->site?->url,
            'slug' => $this->campaign?->adsLink?->slug,
            'tracking_code' => $this->campaign?->adsLink?->tracking_code,
            // Ads manager link (previous behavior)
            'ads_manager_link' => $this->buildAdsManagerLink(),

            'estimate_earning' => round($estimateEarning, 4),
            'r_search_views' => (int) $this->r_search_views,
            'r_conversion' => (int) $this->r_conversion,
            'r_revenue' => round((float) $this->r_revenue, 2),
            'r_rpc' => round((float) $this->r_rpc, 4),
            'r_ad_requests' => (int) $this->r_ad_requests,
            'r_ad_requests_rpm' => round((float) $this->r_ad_requests_rpm, 4),
            'r_impressions' => (int) $this->r_impressions,
            'r_impressions_rpm' => round((float) $this->r_impressions_rpm, 4),
            'r_funnel_requests' => (int) $this->r_funnel_requests,
            'r_funnel_clicks' => (int) $this->r_funnel_clicks,
            'r_funnel_impressions' => (int) $this->r_funnel_impressions,
            'r_funnel_rpm' => round((float) $this->r_funnel_rpm, 4),
            'r_cpa' => round((float) $this->r_cpa, 4),
            'profit' => round($profit, 2),
            'roi' => round($roi, 2),
            'roi_realtime' => round($roi, 2),
            'rt_click_ad_count' => (int) $rtClickAdCount,
            'rt_click_keyword_count' => (int) ($this->realtimeReport?->click_keyword_count ?? 0),
            'rt_view_search_count' => (int) $rtViewSearchCount,
            'rt_view_article_count' => (int) ($this->realtimeReport?->view_article_count ?? 0),
            'rt_cpa' => $rtClickAdCount > 0 ? round($spend / $rtClickAdCount, 4) : null,
            'rt_ctr_search' => $rtViewSearchCount > 0 ? round(($rtClickAdCount / $rtViewSearchCount) * 100, 4) : null,

            // Realtime tracking counters (nullable)
            'realtime_report' => $this->whenLoaded('realtimeReport', function () {
                $rt = $this->realtimeReport;
                if ($rt === null) {
                    return null;
                }

                return [
                    'id' => $rt->id,
                    'campaign_id' => $rt->campaign_id,
                    'ads_link_id' => $this->campaign?->ads_link_id,
                    'view_article_count' => $rt->view_article_count,
                    'view_search_count' => $rt->view_search_count,
                    'click_keyword_count' => $rt->click_keyword_count,
                    'click_ad_count' => $rt->click_ad_count,
                ];
            }),
        ];
    }
}

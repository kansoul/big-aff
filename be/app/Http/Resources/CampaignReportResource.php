<?php

namespace App\Http\Resources;

use App\Models\CampaignReport;
use Carbon\Carbon;
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
        if (! in_array($adsType, ['facebook', 'google'], true)) {
            return null;
        }

        $campaignId = (string) ($this->campaign_id ?? '');

        if ($campaignId === '') {
            return null;
        }

        if ($adsType === 'google') {
            return 'https://ads.google.com/aw/campaigns?campaignId='.$campaignId;
        }

        $accountId = (string) ($this->account_id ?? '');
        if ($accountId === '') {
            return null;
        }

        $dateStart = $this->date_start?->toDateString();
        if ($dateStart === null) {
            return null;
        }

        $startDate = Carbon::parse($dateStart)->toDateString();
        $endDate = Carbon::parse($dateStart)->addDay()->toDateString();

        $base = 'https://adsmanager.facebook.com/adsmanager/manage/adsets';

        return $base.
            '?act='.$accountId.
            '&date='.$startDate.'_'.$endDate.'%2Ctoday'.
            '&comparison_date='.
            '&insights_date='.$startDate.'_'.$endDate.'%2Ctoday'.
            '&insights_comparison_date='.
            '&selected_campaign_ids='.$campaignId.
            '&nav_source=no_referrer';
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $spend = (float) ($this->a_spend ?? 0);
        $revenueEst = (float) ($this->revenue_est ?? 0);
        $profit = (float) ($this->profit ?? $revenueEst - $spend);
        $roi = (float) ($this->roi ?? ($spend > 0 ? ($profit / $spend) * 100 : 0.0));

        $rtClickAdCount = (float) ($this->realtimeReport?->click_ad_count ?? 0);
        $rtClickKeywordCount = (float) ($this->realtimeReport?->click_keyword_count ?? 0);
        $rtViewSearchCount = (float) ($this->realtimeReport?->view_search_count ?? 0);
        $funnelRequests = (float) ($this->r_funnel_requests ?? 0);

        return [
            'id' => $this->id,
            'date_start' => $this->date_start?->format('Y-m-d'),
            'realtime_report_id' => $this->realtime_report_id,

            'account_id' => $this->account_id,
            'account_name' => $this->account_name,
            'campaign_id' => $this->campaign_id,
            'campaign_name' => $this->campaign_name,
            'campaign_status' => $this->campaign_status,
            'ads_type' => $this->ads_type,
            'site_url' => $this->realtimeReport?->linkData?->adsLink?->site?->url,
            'slug' => $this->realtimeReport?->linkData?->adsLink?->slug,
            // Ads manager link (previous behavior)
            'ads_manager_link' => $this->buildAdsManagerLink(),
            'daily_budget' => $this->daily_budget,
            'lifetime_budget' => $this->lifetime_budget,

            'style_code' => $this->style_code,
            'style_name' => $this->style_name,
            'channel_code' => $this->channel_code,
            'channel_name' => $this->channel_name,

            // Revenue fields
            'r_search_views' => $this->r_search_views,
            'r_conversion' => $this->r_conversion,
            'r_revenue' => $this->r_revenue,
            'r_rpc' => $this->r_rpc,
            'r_ad_requests' => $this->r_ad_requests,
            'r_ad_requests_rpm' => $this->r_ad_requests_rpm,
            'r_impressions' => $this->r_impressions,
            'r_impressions_rpm' => $this->r_impressions_rpm,
            'r_funnel_requests' => $this->r_funnel_requests,
            'r_funnel_clicks' => $this->r_funnel_clicks,
            'r_funnel_impressions' => $this->r_funnel_impressions,
            'r_funnel_rpm' => $this->r_funnel_rpm,
            'r_cpa' => $this->r_cpa,

            // Ads / spend fields
            'a_ad_clicks' => $this->a_ad_clicks,
            'a_article_views' => $this->a_article_views,
            'a_search_views' => $this->a_search_views,
            'a_conversion' => $this->a_conversion,
            'a_spend' => $this->a_spend,
            'a_impressions' => $this->a_impressions,
            'a_cpc' => $this->a_cpc,
            'a_cpm' => $this->a_cpm,
            'a_ctr' => $this->a_ctr,
            'a_reach' => $this->a_reach,
            'a_cpa' => $this->a_cpa,
            'a_ctr_link' => $this->a_ctr_link,
            'a_cpc_link' => $this->a_cpc_link,
            'a_frequency' => $this->a_frequency,
            'a_clicks' => $this->a_clicks,

            // Derived
            'revenue_est' => round($revenueEst, 2),
            'profit' => round($profit, 2),
            'roi' => round($roi, 2),
            'roi_realtime' => round($roi, 2),
            'rt_click_ad_count' => (int) $rtClickAdCount,
            'rt_click_keyword_count' => (int) $rtClickKeywordCount,
            'rt_view_search_count' => (int) $rtViewSearchCount,
            'rt_view_article_count' => (int) ($this->realtimeReport?->view_article_count ?? 0),
            'cvr' => $funnelRequests > 0 ? round(((float) ($this->a_clicks ?? 0) / $funnelRequests) * 100, 4) : null,
            'rt_cpa' => $rtClickAdCount > 0 ? round($spend / $rtClickAdCount, 4) : null,
            'rt_cvr' => $funnelRequests > 0 ? round(($rtClickAdCount / $funnelRequests) * 100, 4) : null,
            'rt_ctr_keyword' => $funnelRequests > 0 ? round(($rtClickKeywordCount / $funnelRequests) * 100, 4) : null,
            'rt_ctr_search' => $rtViewSearchCount > 0 ? round(($rtClickAdCount / $rtViewSearchCount) * 100, 4) : null,

            // Realtime tracking counters (nullable)
            'realtime_report' => $this->whenLoaded('realtimeReport', function () {
                $rt = $this->realtimeReport;
                if ($rt === null) {
                    return null;
                }

                return [
                    'id' => $rt->id,
                    'link_data_id' => $rt->link_data_id,
                    'view_article_count' => $rt->view_article_count,
                    'view_search_count' => $rt->view_search_count,
                    'click_keyword_count' => $rt->click_keyword_count,
                    'click_ad_count' => $rt->click_ad_count,
                ];
            }),
        ];
    }
}

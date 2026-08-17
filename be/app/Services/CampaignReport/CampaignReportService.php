<?php

namespace App\Services\CampaignReport;

use App\Actions\CampaignReport\ListCampaignReportsAction;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class CampaignReportService
{
    public function __construct(
        private readonly ListCampaignReportsAction $listCampaignReportsAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return array{
     *     paginator: LengthAwarePaginator,
     *     grand_summary: array<string, mixed>,
     * }
     */
    public function list(array $filters): array
    {
        $paginator = $this->listCampaignReportsAction->execute($filters);

        return [
            'paginator' => $paginator,
            'grand_summary' => $this->computeGrandSummary($filters),
        ];
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    private function computeGrandSummary(array $filters): array
    {
        $revenueByCampaignDate = DB::table('revenue_reports')
            ->selectRaw('campaign_id, DATE(created_at) AS revenue_date,
                SUM(estimate_earning) AS estimate_earning,
                SUM(page_views) AS search_views,
                SUM(clicks) AS conversions,
                SUM(ad_requests) AS ad_requests,
                SUM(impressions) AS impressions,
                SUM(funnel_requests) AS funnel_requests,
                SUM(funnel_clicks) AS funnel_clicks,
                SUM(funnel_impressions) AS funnel_impressions')
            ->groupBy('campaign_id', DB::raw('DATE(created_at)'));

        $row = $this->listCampaignReportsAction->buildBaseQuery($filters)
            ->leftJoin('realtime_reports as rt_summary', 'rt_summary.id', '=', 'campaign_reports.realtime_report_id')
            ->leftJoin('insight_reports as ir_summary', function ($join): void {
                $join->on('ir_summary.account_id', '=', 'campaign_reports.account_id')
                    ->on('ir_summary.campaign_id', '=', 'campaign_reports.campaign_id')
                    ->on('ir_summary.date_start', '=', 'campaign_reports.date_start')
                    ->whereNull('ir_summary.deleted_at');
            })
            ->leftJoinSub($revenueByCampaignDate, 'revenue_summary', function ($join): void {
                $join->on('revenue_summary.campaign_id', '=', 'campaign_reports.campaign_id')
                    ->on('revenue_summary.revenue_date', '=', 'campaign_reports.date_start');
            })
            ->selectRaw('
                COUNT(*) AS record_count,
                COALESCE(SUM(revenue_summary.estimate_earning), 0) AS estimate_earning,
                COALESCE(SUM(revenue_summary.search_views), 0) AS r_search_views,
                COALESCE(SUM(revenue_summary.conversions), 0) AS r_conversion,
                COALESCE(SUM(revenue_summary.estimate_earning), 0) AS r_revenue,
                COALESCE(SUM(revenue_summary.ad_requests), 0) AS r_ad_requests,
                COALESCE(SUM(revenue_summary.impressions), 0) AS r_impressions,
                COALESCE(SUM(revenue_summary.funnel_requests), 0) AS r_funnel_requests,
                COALESCE(SUM(revenue_summary.funnel_clicks), 0) AS r_funnel_clicks,
                COALESCE(SUM(revenue_summary.funnel_impressions), 0) AS r_funnel_impressions,
                COALESCE(SUM(ir_summary.spend), 0) AS a_spend,
                COALESCE(SUM(rt_summary.lead_count), 0) AS rt_lead_count,
                COALESCE(SUM(rt_summary.next_step_count), 0) AS rt_next_step_count,
                COALESCE(SUM(rt_summary.redirect_count), 0) AS rt_redirect_count,
                COALESCE(SUM(rt_summary.view_count), 0) AS rt_view_count
            ')
            ->first();

        return $this->finalizeSummary([
            'record_count' => (int) ($row->record_count ?? 0),
            'estimate_earning' => (float) ($row->estimate_earning ?? 0),
            'r_search_views' => (int) ($row->r_search_views ?? 0),
            'r_conversion' => (int) ($row->r_conversion ?? 0),
            'r_revenue' => (float) ($row->r_revenue ?? 0),
            'r_ad_requests' => (int) ($row->r_ad_requests ?? 0),
            'r_impressions' => (int) ($row->r_impressions ?? 0),
            'r_funnel_requests' => (int) ($row->r_funnel_requests ?? 0),
            'r_funnel_clicks' => (int) ($row->r_funnel_clicks ?? 0),
            'r_funnel_impressions' => (int) ($row->r_funnel_impressions ?? 0),
            'a_spend' => (float) ($row->a_spend ?? 0),
            'rt_lead_count' => (int) ($row->rt_lead_count ?? 0),
            'rt_next_step_count' => (int) ($row->rt_next_step_count ?? 0),
            'rt_redirect_count' => (int) ($row->rt_redirect_count ?? 0),
            'rt_view_count' => (int) ($row->rt_view_count ?? 0),
        ]);
    }

    /**
     * @param  array<string, mixed>  $summary
     * @return array<string, mixed>
     */
    private function finalizeSummary(array $summary): array
    {
        $earning = (float) ($summary['estimate_earning'] ?? 0);
        $spend = (float) ($summary['a_spend'] ?? 0);
        $profit = $earning - $spend;
        $leads = (int) ($summary['rt_lead_count'] ?? 0);
        $views = (int) ($summary['rt_view_count'] ?? 0);
        $revenue = (float) ($summary['r_revenue'] ?? 0);
        $conversions = (int) ($summary['r_conversion'] ?? 0);
        $adRequests = (int) ($summary['r_ad_requests'] ?? 0);
        $impressions = (int) ($summary['r_impressions'] ?? 0);
        $funnelImpressions = (int) ($summary['r_funnel_impressions'] ?? 0);

        return [
            ...$summary,
            'r_rpc' => $conversions > 0 ? round($revenue / $conversions, 4) : 0.0,
            'r_ad_requests_rpm' => $adRequests > 0 ? round($revenue / $adRequests * 1000, 4) : 0.0,
            'r_impressions_rpm' => $impressions > 0 ? round($revenue / $impressions * 1000, 4) : 0.0,
            'r_funnel_rpm' => $funnelImpressions > 0 ? round($revenue / $funnelImpressions * 1000, 4) : 0.0,
            'r_cpa' => $conversions > 0 ? round($spend / $conversions, 4) : 0.0,
            'profit' => round($profit, 2),
            'roi' => $spend > 0 ? round(($profit / $spend) * 100, 2) : 0.0,
            'roi_realtime' => $spend > 0 ? round(($profit / $spend) * 100, 2) : 0.0,
            'rt_cpa' => $leads > 0 ? round($spend / $leads, 4) : 0.0,
            'rt_ctr' => $views > 0 ? round(($leads / $views) * 100, 4) : 0.0,
        ];
    }
}

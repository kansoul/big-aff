<?php

namespace App\Actions\CampaignReport;

use App\Models\CampaignReport;
use App\Models\RealtimeReport;
use App\Support\OwnershipFilter\OwnershipFilter;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class ListCampaignReportsAction
{
    /**
     * @var array<int, string>
     */
    public const ORDERABLE_COLUMNS = [
        'id',
        'date_start',
        'account_id',
        'account_name',
        'campaign_id',
        'campaign_name',
        'campaign_status',
        'ads_type',
        'channel_code',
        'channel_name',
        'style_code',
        'style_name',
        'daily_budget',
        'lifetime_budget',
        // revenue
        'r_search_views',
        'r_conversion',
        'r_revenue',
        'r_rpc',
        'r_ad_requests',
        'r_ad_requests_rpm',
        'r_impressions',
        'r_impressions_rpm',
        'r_funnel_requests',
        'r_funnel_clicks',
        'r_funnel_impressions',
        'r_funnel_rpm',
        'r_cpa',
        // ads
        'a_ad_clicks',
        'a_article_views',
        'a_search_views',
        'a_conversion',
        'a_spend',
        'a_impressions',
        'a_cpc',
        'a_cpm',
        'a_ctr',
        'a_reach',
        'a_cpa',
        'a_ctr_link',
        'a_cpc_link',
        'a_frequency',
        'a_clicks',
        // derived (computed in SELECT)
        'rpc',
        'revenue_est',
        'profit',
        'roi',
        'rt_cpa',
        'rt_cvr',
        'rt_ctr_keyword',
        'rt_ctr_search',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $rpcExpr = 'IF(NULLIF(campaign_reports.r_rpc, 0) IS NOT NULL, campaign_reports.r_rpc, IF(NULLIF(campaign_reports.r_conversion, 0) IS NOT NULL, campaign_reports.r_revenue / campaign_reports.r_conversion, 0))';

        $query = $this->buildBaseQuery($filters)
            ->leftJoin('realtime_reports as rt', 'rt.id', '=', 'campaign_reports.realtime_report_id')
            ->select(
                'campaign_reports.*',
                DB::raw("({$rpcExpr}) as rpc"),
                DB::raw("COALESCE(rt.click_ad_count, 0) * ({$rpcExpr}) as revenue_est"),
                DB::raw("(COALESCE(rt.click_ad_count, 0) * ({$rpcExpr})) - COALESCE(campaign_reports.a_spend, 0) as profit"),
                DB::raw("IF(COALESCE(campaign_reports.a_spend, 0) > 0, ((COALESCE(rt.click_ad_count, 0) * ({$rpcExpr})) - COALESCE(campaign_reports.a_spend, 0)) / COALESCE(campaign_reports.a_spend, 0) * 100, 0) as roi"),
                DB::raw('IF(COALESCE(rt.click_ad_count, 0) > 0, COALESCE(campaign_reports.a_spend, 0) / rt.click_ad_count, NULL) as rt_cpa'),
                DB::raw('IF(COALESCE(campaign_reports.r_funnel_requests, 0) > 0, COALESCE(rt.click_ad_count, 0) / campaign_reports.r_funnel_requests * 100, NULL) as rt_cvr'),
                DB::raw('IF(COALESCE(campaign_reports.r_funnel_requests, 0) > 0, COALESCE(rt.click_keyword_count, 0) / campaign_reports.r_funnel_requests * 100, NULL) as rt_ctr_keyword'),
                DB::raw('IF(COALESCE(rt.view_search_count, 0) > 0, COALESCE(rt.click_ad_count, 0) / rt.view_search_count * 100, NULL) as rt_ctr_search'),
            )
            ->with([
                'realtimeReport.linkData.adsLink.site',
            ]);

        SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'date_start',
            defaultDirection: 'desc',
        )->applyTo($query);

        $query->orderBy('campaign_reports.channel_code');

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }

    /**
     * Build the filtered (but unsorted, unpaginated) base query. Used by both the list
     * action and the service layer (e.g. for computing grand summary / group summary).
     *
     * @param  array<string, mixed>  $filters
     * @return Builder<CampaignReport>
     */
    public function buildBaseQuery(array $filters): Builder
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = CampaignReport::query();

        $ownership->applyThroughAccount($query);

        if (! empty($filters['date_from'])) {
            $query->whereDate('date_start', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('date_start', '<=', $filters['date_to']);
        }

        if (! empty($filters['user_ids'])) {
            $userIds = $ownership->isAdmin()
                ? $filters['user_ids']
                : array_values(array_intersect($filters['user_ids'], $ownership->allowedUserIds()));

            $query->whereIn('campaign_reports.account_id', function ($sub) use ($userIds, $filters) {
                $sub->select('accounts.account_id')
                    ->from('account_user')
                    ->join('accounts', 'accounts.id', '=', 'account_user.account_id')
                    ->when(! empty($filters['account_ids']), function ($sub) use ($filters) {
                        $sub->whereIn('accounts.account_id', $filters['account_ids']);
                    })
                    ->whereIn('user_id', $userIds);
            });
        }

        if (! empty($filters['account_ids'])) {
            $query->whereIn('campaign_reports.account_id', $filters['account_ids']);
        }

        if (! empty($filters['ads_type'])) {
            $query->where('ads_type', $filters['ads_type']);
        }

        if (! empty($filters['campaign_ids'])) {
            $query->whereIn('campaign_id', $filters['campaign_ids']);
        }

        if (! empty($filters['channel_codes'])) {
            $query->whereIn('campaign_reports.channel_code', $filters['channel_codes']);
        }

        if (! empty($filters['link_data_ids'])) {
            $query->whereIn(
                'realtime_report_id',
                RealtimeReport::whereIn('link_data_id', $filters['link_data_ids'])->select('id'),
            );
        }

        return $query;
    }
}

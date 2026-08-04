<?php

namespace App\Actions\CampaignReport;

use App\Models\CampaignReport;
use App\Support\MainTeam\MainTeamReportDataScope;
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
        'adset_id',
        'ad_id',
        'session_id',
        'campaign_status',
        'ads_type',
        'estimate_earning',
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
        'profit',
        'roi',
        'rt_cpa',
        'rt_ctr_search',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $revenueBySession = DB::table('revenue_reports')
            ->selectRaw('campaign_id, adset_id, ad_id, session_id, MAX(click_id) AS click_id,
                DATE(created_at) AS revenue_date,
                SUM(estimate_earning) AS estimate_earning,
                SUM(page_views) AS search_views,
                SUM(clicks) AS conversions,
                SUM(ad_requests) AS ad_requests,
                SUM(impressions) AS impressions,
                SUM(funnel_requests) AS funnel_requests,
                SUM(funnel_clicks) AS funnel_clicks,
                SUM(funnel_impressions) AS funnel_impressions')
            ->groupBy('campaign_id', 'adset_id', 'ad_id', 'session_id', DB::raw('DATE(created_at)'));

        $query = $this->buildBaseQuery($filters)
            ->leftJoin('realtime_reports as rt', 'rt.id', '=', 'campaign_reports.realtime_report_id')
            ->leftJoinSub($revenueBySession, 'revenue_totals', function ($join): void {
                $join->on('revenue_totals.campaign_id', '=', 'campaign_reports.campaign_id')
                    ->on('revenue_totals.revenue_date', '=', 'campaign_reports.date_start');
            })
            ->leftJoin('insight_reports as ir', function ($join): void {
                $join->on('ir.account_id', '=', 'campaign_reports.account_id')
                    ->on('ir.campaign_id', '=', 'campaign_reports.campaign_id')
                    ->on('ir.date_start', '=', 'campaign_reports.date_start')
                    ->whereNull('ir.deleted_at');
            })
            ->leftJoin('users as u_list', 'u_list.id', '=', 'campaign_reports.owner_user_id')
            ->select(
                'campaign_reports.*',
                DB::raw('u_list.email as user_email'),
                DB::raw('revenue_totals.adset_id as adset_id'),
                DB::raw('revenue_totals.ad_id as ad_id'),
                DB::raw('revenue_totals.session_id as session_id'),
                DB::raw('revenue_totals.click_id as click_id'),
                DB::raw('COALESCE(ir.spend, 0) as a_spend'),
                DB::raw('COALESCE(ir.clicks, 0) as a_clicks'),
                DB::raw('COALESCE(ir.search_clicks, 0) as a_conversion'),
                DB::raw('COALESCE(revenue_totals.estimate_earning, 0) as estimate_earning'),
                DB::raw('COALESCE(revenue_totals.search_views, 0) as r_search_views'),
                DB::raw('COALESCE(revenue_totals.conversions, 0) as r_conversion'),
                DB::raw('COALESCE(revenue_totals.estimate_earning, 0) as r_revenue'),
                DB::raw('IF(COALESCE(revenue_totals.conversions, 0) > 0, revenue_totals.estimate_earning / revenue_totals.conversions, 0) as r_rpc'),
                DB::raw('COALESCE(revenue_totals.ad_requests, 0) as r_ad_requests'),
                DB::raw('IF(COALESCE(revenue_totals.ad_requests, 0) > 0, revenue_totals.estimate_earning / revenue_totals.ad_requests * 1000, 0) as r_ad_requests_rpm'),
                DB::raw('COALESCE(revenue_totals.impressions, 0) as r_impressions'),
                DB::raw('IF(COALESCE(revenue_totals.impressions, 0) > 0, revenue_totals.estimate_earning / revenue_totals.impressions * 1000, 0) as r_impressions_rpm'),
                DB::raw('COALESCE(revenue_totals.funnel_requests, 0) as r_funnel_requests'),
                DB::raw('COALESCE(revenue_totals.funnel_clicks, 0) as r_funnel_clicks'),
                DB::raw('COALESCE(revenue_totals.funnel_impressions, 0) as r_funnel_impressions'),
                DB::raw('IF(COALESCE(revenue_totals.funnel_impressions, 0) > 0, revenue_totals.estimate_earning / revenue_totals.funnel_impressions * 1000, 0) as r_funnel_rpm'),
                DB::raw('IF(COALESCE(revenue_totals.conversions, 0) > 0, COALESCE(ir.spend, 0) / revenue_totals.conversions, 0) as r_cpa'),
                DB::raw('COALESCE(revenue_totals.estimate_earning, 0) - COALESCE(ir.spend, 0) as profit'),
                DB::raw('IF(COALESCE(ir.spend, 0) > 0, (COALESCE(revenue_totals.estimate_earning, 0) - COALESCE(ir.spend, 0)) / COALESCE(ir.spend, 0) * 100, 0) as roi'),
                DB::raw('IF(COALESCE(rt.click_ad_count, 0) > 0, COALESCE(ir.spend, 0) / rt.click_ad_count, NULL) as rt_cpa'),
                DB::raw('IF(COALESCE(rt.view_search_count, 0) > 0, COALESCE(rt.click_ad_count, 0) / rt.view_search_count * 100, NULL) as rt_ctr_search'),
            )
            ->withExists(['campaign as has_rule' => fn ($q) => $q->whereHas('campaignRules', fn ($q) => $q->where('is_active', true))])
            ->with([
                'realtimeReport',
                'campaign.adsLink.site',
            ]);

        $sort = SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'date_start',
            defaultDirection: 'desc',
        );

        $derivedColumns = [
            'adset_id',
            'ad_id',
            'session_id',
            'estimate_earning',
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
            'profit',
            'roi',
            'rt_cpa',
            'rt_ctr_search',
        ];
        $sortColumn = in_array($sort->column, $derivedColumns, true)
            ? $sort->column
            : 'campaign_reports.'.$sort->column;

        $query->orderBy($sortColumn, $sort->direction);
        if ($sort->column !== 'id') {
            $query->orderBy('campaign_reports.id', $sort->direction);
        }

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

        if (config('main_system.is_main')) {
            MainTeamReportDataScope::excludeNonFetchableAccounts(
                $query,
                'campaign_reports.account_id',
                adsTypeColumn: 'campaign_reports.ads_type',
            );
        }

        if (! empty($filters['user_ids'])) {
            $userIds = $ownership->isAdmin()
                ? array_map('intval', (array) $filters['user_ids'])
                : array_values(array_intersect(
                    array_map('intval', (array) $filters['user_ids']),
                    $ownership->allowedUserIds(),
                ));

            $query->whereIn('campaign_reports.owner_user_id', $userIds);
        } else {
            $ownership->applyTo($query, 'campaign_reports.owner_user_id');
        }

        if (! empty($filters['date_from'])) {
            $query->whereDate('campaign_reports.date_start', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('campaign_reports.date_start', '<=', $filters['date_to']);
        }

        if (! empty($filters['keyword'])) {
            $keyword = (string) $filters['keyword'];

            $query->where(function (Builder $builder) use ($keyword): void {
                $builder
                    ->where('campaign_reports.account_id', 'like', "%{$keyword}%")
                    ->orWhere('campaign_reports.account_name', 'like', "%{$keyword}%")
                    ->orWhere('campaign_reports.campaign_id', 'like', "%{$keyword}%")
                    ->orWhere('campaign_reports.campaign_name', 'like', "%{$keyword}%")
                    ->orWhereHas('campaign.adsLink', function (Builder $adsLink) use ($keyword): void {
                        $adsLink->where('slug', 'like', "%{$keyword}%");
                    })
                    ->orWhereHas('campaign.adsLink.site', function (Builder $site) use ($keyword): void {
                        $site->where('url', 'like', "%{$keyword}%")
                            ->orWhere('name', 'like', "%{$keyword}%");
                    });
            });
        }

        if (! empty($filters['account_ids'])) {
            $query->whereIn('campaign_reports.account_id', $filters['account_ids']);
        }

        if (! empty($filters['ads_type'])) {
            $query->where('campaign_reports.ads_type', $filters['ads_type']);
        }

        if (! empty($filters['campaign_ids'])) {
            $query->whereIn('campaign_reports.campaign_id', $filters['campaign_ids']);
        }

        return $query;
    }
}

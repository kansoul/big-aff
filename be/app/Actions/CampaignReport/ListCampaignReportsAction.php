<?php

namespace App\Actions\CampaignReport;

use App\Models\Account;
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
        'ads_type',
        'channel_code',
        'channel_name',
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
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $query = $this->buildBaseQuery($filters)
            ->leftJoin('revenue_reports as rv', function ($join) {
                $join->on('rv.channel_code', '=', 'campaign_reports.channel_code')
                    ->on('rv.date', '=', 'campaign_reports.date_start');
            })
            ->select(
                'campaign_reports.*',
                DB::raw('COALESCE(rv.estimated_earnings, 0) as r_estimated_earnings'),
                DB::raw('COALESCE(rv.cost_per_click, 0) as rpc'),
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

        $ownership->applyThrough(
            $query,
            'account_id',
            fn (array $ids) => Account::join('account_user', 'account_user.account_id', '=', 'accounts.id')
                ->whereIn('account_user.user_id', $ids)
                ->select('accounts.id'),
        );

        if (! empty($filters['date_from'])) {
            $query->whereDate('date_start', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('date_start', '<=', $filters['date_to']);
        }

        if (! empty($filters['user_ids'])) {
            $userIds = $filters['user_ids'];
            $query->whereIn('account_id', function ($sub) use ($userIds) {
                $sub->select('account_id')
                    ->from('account_user')
                    ->whereIn('user_id', $userIds);
            });
        }

        if (! empty($filters['account_ids'])) {
            $query->whereIn('account_id', $filters['account_ids']);
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

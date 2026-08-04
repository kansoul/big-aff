<?php

namespace App\Actions\Campaign;

use App\Models\Campaign;
use App\Models\CampaignReport;
use App\Support\MainTeam\MainTeamReportDataScope;
use App\Support\OwnerResource\AccountLinkedOwnerResource;
use App\Support\PaginationInput\PaginationInput;
use App\Support\SortInput\SortInput;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ListCampaignSelectorAction
{
    /**
     * @var array<int, string>
     */
    public const ORDERABLE_COLUMNS = [
        'campaign_id',
        'campaign_name',
        'total_spend',
        'total_revenue',
        'profit',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function execute(array $filters): LengthAwarePaginator
    {
        $resource = new AccountLinkedOwnerResource;
        $revenueByCampaign = DB::table('revenue_reports')
            ->selectRaw('campaign_id, DATE(created_at) as report_date, SUM(estimate_earning) as total_revenue')
            ->groupBy('campaign_id', DB::raw('DATE(created_at)'));

        $query = CampaignReport::query()
            ->leftJoin('insight_reports', function ($join): void {
                $join->on('insight_reports.account_id', '=', 'campaign_reports.account_id')
                    ->on('insight_reports.campaign_id', '=', 'campaign_reports.campaign_id')
                    ->on('insight_reports.date_start', '=', 'campaign_reports.date_start')
                    ->whereNull('insight_reports.deleted_at');
            })
            ->leftJoinSub($revenueByCampaign, 'revenue_totals', function ($join): void {
                $join->on('revenue_totals.campaign_id', '=', 'campaign_reports.campaign_id')
                    ->on('revenue_totals.report_date', '=', 'campaign_reports.date_start');
            })
            ->selectRaw('
                campaign_reports.campaign_id,
                campaign_reports.campaign_name,
                campaign_reports.account_id,
                campaign_reports.account_name,
                COALESCE(insight_reports.spend, 0) as total_spend,
                COALESCE(revenue_totals.total_revenue, 0) as total_revenue,
                COALESCE(revenue_totals.total_revenue, 0) - COALESCE(insight_reports.spend, 0) as profit
            ')
            ->whereDate('campaign_reports.date_start', today());

        if (config('main_system.is_main')) {
            MainTeamReportDataScope::excludeNonFetchableAccounts(
                $query,
                'campaign_reports.account_id',
                adsTypeColumn: 'campaign_reports.ads_type',
            );
        }

        if (! $resource->isAdmin()) {
            $query->whereIn(
                'campaign_reports.campaign_id',
                Campaign::whereIn('created_by', $resource->allowedUserIds())->select('campaign_id'),
            );
        }

        if (! empty($filters['account_id'])) {
            $query->where('campaign_reports.account_id', $filters['account_id']);
        }

        if (! empty($filters['user_id'])) {
            $query->whereIn('campaign_reports.campaign_id', Campaign::where('created_by', $filters['user_id'])->select('campaign_id'));
        }

        if (! empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('campaign_reports.campaign_name', 'like', "%{$search}%")
                    ->orWhere('campaign_reports.campaign_id', 'like', "%{$search}%");
            });
        }

        if (isset($filters['min_spend'])) {
            $query->where('insight_reports.spend', '>=', (float) $filters['min_spend']);
        }

        if (isset($filters['min_revenue'])) {
            $query->whereRaw('COALESCE(revenue_totals.total_revenue, 0) >= ?', [(float) $filters['min_revenue']]);
        }

        if (isset($filters['min_profit'])) {
            $query->whereRaw('COALESCE(revenue_totals.total_revenue, 0) - COALESCE(insight_reports.spend, 0) >= ?', [(float) $filters['min_profit']]);
        }

        $sort = SortInput::fromValidatedArray(
            $filters,
            self::ORDERABLE_COLUMNS,
            defaultColumn: 'total_spend',
            defaultDirection: 'desc',
        );

        $sortColumn = $sort->column === 'campaign_id'
            ? 'campaign_reports.campaign_id'
            : $sort->column;

        $query->orderBy($sortColumn, $sort->direction)
            ->orderBy('campaign_reports.id', $sort->direction);

        return PaginationInput::fromValidatedArray($filters)->paginateQuery($query);
    }
}

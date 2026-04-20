<?php

namespace App\Services\RevenueStats;

use App\Models\Account;
use App\Models\CampaignReport;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class RevenueStatsService
{
    /**
     * @param  array{date_from?: string|null, date_to?: string|null, team_ids?: int[]|null, user_ids?: int[]|null}  $filters
     * @return array{revenue: float, spend: float, profit: float, roi: float}
     */
    public function overview(array $filters): array
    {
        $row = $this->baseQuery($filters)
            ->selectRaw('
                COALESCE(SUM(campaign_reports.r_revenue), 0) as revenue,
                COALESCE(SUM(campaign_reports.a_spend), 0) as spend
            ')
            ->first();

        $revenue = (float) ($row->revenue ?? 0);
        $spend = (float) ($row->spend ?? 0);
        $profit = $revenue - $spend;
        $roi = $spend > 0 ? ($profit / $spend) * 100 : 0;

        return compact('revenue', 'spend', 'profit', 'roi');
    }

    /**
     * @param  array{date_from?: string|null, date_to?: string|null, team_ids?: int[]|null, user_ids?: int[]|null}  $filters
     */
    public function byTeam(array $filters): Collection
    {
        return $this->baseQuery($filters)
            ->join('account_user as au', 'au.account_id', '=', 'a.id')
            ->leftJoin('team_user as tu', 'tu.user_id', '=', 'au.user_id')
            ->leftJoin('teams as t', 't.id', '=', 'tu.team_id')
            ->groupBy('tu.team_id', 't.name')
            ->selectRaw("
                COALESCE(tu.team_id, 0) as team_id,
                COALESCE(t.name, '(No team)') as team_name,
                COALESCE(SUM(campaign_reports.r_revenue), 0) as revenue,
                COALESCE(SUM(campaign_reports.a_spend), 0) as spend,
                COALESCE(SUM(campaign_reports.r_revenue), 0) - COALESCE(SUM(campaign_reports.a_spend), 0) as profit
            ")
            ->orderByDesc('revenue')
            ->get();
    }

    /**
     * @param  array{date_from?: string|null, date_to?: string|null, team_ids?: int[]|null, user_ids?: int[]|null}  $filters
     */
    public function byUser(array $filters): Collection
    {
        return $this->baseQuery($filters)
            ->join('account_user as au', 'au.account_id', '=', 'a.id')
            ->leftJoin('users as u', 'u.id', '=', 'au.user_id')
            ->leftJoin('team_user as tu', 'tu.user_id', '=', 'au.user_id')
            ->leftJoin('teams as t', 't.id', '=', 'tu.team_id')
            ->groupBy('au.user_id', 'u.name', 'tu.team_id', 't.name')
            ->selectRaw("
                au.user_id as user_id,
                COALESCE(u.name, '(Unknown)') as user_name,
                COALESCE(tu.team_id, 0) as team_id,
                COALESCE(t.name, '(No team)') as team_name,
                COALESCE(SUM(campaign_reports.r_revenue), 0) as revenue,
                COALESCE(SUM(campaign_reports.a_spend), 0) as spend,
                COALESCE(SUM(campaign_reports.r_revenue), 0) - COALESCE(SUM(campaign_reports.a_spend), 0) as profit
            ")
            ->orderByRaw('(revenue - spend) DESC')
            ->get();
    }

    /**
     * @param  array{date_from?: string|null, date_to?: string|null, team_ids?: int[]|null, user_ids?: int[]|null}  $filters
     */
    private function baseQuery(array $filters): Builder
    {
        $query = CampaignReport::query()
            ->join('accounts as a', 'a.id', '=', 'campaign_reports.account_id');

        $ownership = OwnershipFilter::forAuthUser();
        $ownership->applyThrough(
            $query,
            'campaign_reports.account_id',
            fn (array $ids) => Account::join('account_user', 'account_user.account_id', '=', 'accounts.id')
                ->whereIn('account_user.user_id', $ids)
                ->select('accounts.id'),
        );

        if (! empty($filters['date_from'])) {
            $query->whereDate('campaign_reports.date_start', '>=', $filters['date_from']);
        }

        if (! empty($filters['date_to'])) {
            $query->whereDate('campaign_reports.date_start', '<=', $filters['date_to']);
        }

        if (! empty($filters['team_ids'])) {
            $query->whereIn('a.team_id', $filters['team_ids']);
        }

        if (! empty($filters['user_ids'])) {
            $query->whereIn('campaign_reports.account_id', function ($sub) use ($filters) {
                $sub->select('account_id')
                    ->from('account_user')
                    ->whereIn('user_id', $filters['user_ids']);
            });
        }

        return $query;
    }
}

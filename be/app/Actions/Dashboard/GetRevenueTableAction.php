<?php

namespace App\Actions\Dashboard;

use App\Models\Account;
use App\Models\CampaignReport;
use App\Support\OwnershipFilter\OwnershipFilter;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class GetRevenueTableAction
{
    public function execute(array $filters): array
    {
        $ownership = OwnershipFilter::forAuthUser();
        $now = Carbon::now();
        $limit = min((int) ($filters['top_limit'] ?? 10), 50);

        return [
            'by_team' => $this->byTeam($ownership, $now),
            'top_users' => $this->topUsers($ownership, $now, $limit),
        ];
    }

    private function baseQuery(OwnershipFilter $ownership, Carbon $now): Builder
    {
        $from = $now->copy()->startOfMonth()->toDateString();
        $to = $now->copy()->endOfMonth()->toDateString();

        $query = CampaignReport::query()
            ->join('accounts as a', 'a.id', '=', 'campaign_reports.account_id');

        $ownership->applyThrough(
            $query,
            'campaign_reports.account_id',
            fn (array $ids) => Account::join('account_user', 'account_user.account_id', '=', 'accounts.id')
                ->whereIn('account_user.user_id', $ids)
                ->select('accounts.id'),
        );

        $query->whereDate('campaign_reports.date_start', '>=', $from)
            ->whereDate('campaign_reports.date_start', '<=', $to);

        return $query;
    }

    private function byTeam(OwnershipFilter $ownership, Carbon $now): Collection
    {
        $today = $now->toDateString();

        return $this->baseQuery($ownership, $now)
            ->join('account_user as au', 'au.account_id', '=', 'a.id')
            ->leftJoin('team_user as tu', 'tu.user_id', '=', 'au.user_id')
            ->leftJoin('teams as t', 't.id', '=', 'tu.team_id')
            ->groupBy('tu.team_id', 't.name')
            ->selectRaw("
                COALESCE(tu.team_id, 0) as team_id,
                COALESCE(t.name, '(No team)') as team_name,
                COALESCE(SUM(CASE WHEN campaign_reports.date_start = ? THEN campaign_reports.r_revenue ELSE 0 END), 0) as daily_revenue,
                COALESCE(SUM(CASE WHEN campaign_reports.date_start = ? THEN campaign_reports.a_spend ELSE 0 END), 0) as daily_spend,
                COALESCE(SUM(campaign_reports.r_revenue), 0) as monthly_revenue,
                COALESCE(SUM(campaign_reports.a_spend), 0) as monthly_spend
            ", [$today, $today])
            ->orderByRaw('COALESCE(SUM(campaign_reports.r_revenue), 0) DESC')
            ->get()
            ->map(function ($row) {
                $dailyRevenue = (float) $row->daily_revenue;
                $dailySpend = (float) $row->daily_spend;
                $dailyProfit = $dailyRevenue - $dailySpend;
                $dailyRoi = $dailySpend > 0 ? round(($dailyProfit / $dailySpend) * 100, 2) : 0.0;

                $monthlyRevenue = (float) $row->monthly_revenue;
                $monthlySpend = (float) $row->monthly_spend;
                $monthlyProfit = $monthlyRevenue - $monthlySpend;
                $monthlyRoi = $monthlySpend > 0 ? round(($monthlyProfit / $monthlySpend) * 100, 2) : 0.0;

                return [
                    'team_id' => (int) $row->team_id,
                    'team_name' => $row->team_name,
                    'daily' => [
                        'revenue' => round($dailyRevenue, 2),
                        'spend' => round($dailySpend, 2),
                        'profit' => round($dailyProfit, 2),
                        'roi' => $dailyRoi,
                    ],
                    'monthly' => [
                        'revenue' => round($monthlyRevenue, 2),
                        'spend' => round($monthlySpend, 2),
                        'profit' => round($monthlyProfit, 2),
                        'roi' => $monthlyRoi,
                    ],
                ];
            });
    }

    private function topUsers(OwnershipFilter $ownership, Carbon $now, int $limit): Collection
    {
        $today = $now->toDateString();

        return $this->baseQuery($ownership, $now)
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
                COALESCE(SUM(CASE WHEN campaign_reports.date_start = ? THEN campaign_reports.r_revenue ELSE 0 END), 0) as daily_revenue,
                COALESCE(SUM(CASE WHEN campaign_reports.date_start = ? THEN campaign_reports.a_spend ELSE 0 END), 0) as daily_spend,
                COALESCE(SUM(campaign_reports.r_revenue), 0) as monthly_revenue,
                COALESCE(SUM(campaign_reports.a_spend), 0) as monthly_spend
            ", [$today, $today])
            ->orderByRaw('(COALESCE(SUM(campaign_reports.r_revenue), 0) - COALESCE(SUM(campaign_reports.a_spend), 0)) DESC')
            ->limit($limit)
            ->get()
            ->map(function ($row) {
                $dailyRevenue = (float) $row->daily_revenue;
                $dailySpend = (float) $row->daily_spend;
                $dailyProfit = $dailyRevenue - $dailySpend;
                $dailyRoi = $dailySpend > 0 ? round(($dailyProfit / $dailySpend) * 100, 2) : 0.0;

                $monthlyRevenue = (float) $row->monthly_revenue;
                $monthlySpend = (float) $row->monthly_spend;
                $monthlyProfit = $monthlyRevenue - $monthlySpend;
                $monthlyRoi = $monthlySpend > 0 ? round(($monthlyProfit / $monthlySpend) * 100, 2) : 0.0;

                return [
                    'user_id' => $row->user_id,
                    'user_name' => $row->user_name,
                    'team_id' => (int) $row->team_id,
                    'team_name' => $row->team_name,
                    'daily' => [
                        'revenue' => round($dailyRevenue, 2),
                        'spend' => round($dailySpend, 2),
                        'profit' => round($dailyProfit, 2),
                        'roi' => $dailyRoi,
                    ],
                    'monthly' => [
                        'revenue' => round($monthlyRevenue, 2),
                        'spend' => round($monthlySpend, 2),
                        'profit' => round($monthlyProfit, 2),
                        'roi' => $monthlyRoi,
                    ],
                ];
            });
    }
}

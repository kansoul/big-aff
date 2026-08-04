<?php

namespace App\Actions\Dashboard;

use App\Enums\Permission;
use App\Enums\TeamRole;
use App\Models\InsightReport;
use App\Models\RevenueReport;
use App\Support\MainTeam\MainTeamReportDataScope;
use App\Support\OwnershipFilter\OwnershipFilter;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Builds the Revenue dashboard table rows:
 *   - `by_team`: one row per team, aggregated from its users
 *   - `top_users`: top-N users ranked by monthly profit
 *
 * Attribution rules (to guarantee totals match GetInsightChartAction regardless
 * of how many users share an account or channel in the pivot tables):
 *   - Each account is attributed to a single "primary" user = MIN(user_id) on account_user.
 *   - Revenue is attributed using the owner snapshot stored on each report row.
 *   - Each user is attributed to a single "primary" team by role priority:
 *     leader > member > manager. Users not in any team → "(No team)".
 */
class GetRevenueTableAction
{
    public function execute(array $filters): array
    {
        $now = Carbon::now();
        $limit = min((int) ($filters['top_limit'] ?? 10), 50);

        $spendByUser = $this->spendByUser($now);
        $revenueByUser = $this->revenueByUser($now);

        $userIds = $spendByUser->keys()
            ->merge($revenueByUser->keys())
            ->unique()
            ->map(fn ($id) => (int) $id)
            ->all();

        $userInfo = $this->userInfo($userIds);

        $userRows = $this->buildUserRows($userIds, $spendByUser, $revenueByUser, $userInfo);
        /** @var User $user */
        $user = Auth::user();
        $user->load('role');

        return [
            'by_team' => $user->hasPermissionFlag(Permission::DashboardTeamView) ? $this->byTeam($userRows) : [],
            'top_users' => $user->hasPermissionFlag(Permission::DashboardUserView) ? $this->topUsers($userRows, $limit) : [],
            'top_main_teams' => $user->is_admin && config('main_system.is_main') ? $this->mainTeamRows($now, $limit) : [],
        ];
    }

    /**
     * Spend per user for the current month.
     *
     *   aggregate spend per account → attribute each account to its primary user
     *   (MIN user_id on account_user) → aggregate per user.
     */
    private function spendByUser(Carbon $now): Collection
    {
        $from = $now->copy()->startOfMonth()->toDateString();
        $to = $now->copy()->endOfMonth()->toDateString();
        $today = $now->toDateString();
        $yesterday = $now->copy()->subDay()->toDateString();

        $query = InsightReport::query()
            ->whereDate('date_start', '>=', $from)
            ->whereDate('date_start', '<=', $to)
            ->when(config('main_system.is_main'), fn ($q) => MainTeamReportDataScope::excludeNonFetchableAccounts($q))
            ->whereNotNull('owner_user_id')
            ->selectRaw('
                owner_user_id as user_id,
                COALESCE(SUM(CASE WHEN date_start = ? THEN spend ELSE 0 END), 0) as daily_spend,
                COALESCE(SUM(CASE WHEN date_start = ? THEN spend ELSE 0 END), 0) as yesterday_spend,
                COALESCE(SUM(spend), 0) as monthly_spend
            ', [$today, $yesterday])
            ->groupBy('owner_user_id');

        OwnershipFilter::forAuthUser()->applyTo($query, 'owner_user_id');

        return $query->get()->keyBy('user_id');
    }

    /**
     * Revenue per user for the current month. Mirrors spendByUser but over channels.
     */
    private function revenueByUser(Carbon $now): Collection
    {
        $from = $now->copy()->startOfMonth()->toDateString();
        $to = $now->copy()->endOfMonth()->toDateString();
        $today = $now->toDateString();
        $yesterday = $now->copy()->subDay()->toDateString();

        $query = RevenueReport::query()
            ->join('campaigns as revenue_campaigns', 'revenue_campaigns.campaign_id', '=', 'revenue_reports.campaign_id')
            ->whereDate('revenue_reports.created_at', '>=', $from)
            ->whereDate('revenue_reports.created_at', '<=', $to)
            ->whereNotNull('revenue_campaigns.created_by')
            ->selectRaw('
                revenue_campaigns.created_by as user_id,
                COALESCE(SUM(CASE WHEN DATE(revenue_reports.created_at) = ? THEN estimate_earning ELSE 0 END), 0) as daily_revenue,
                COALESCE(SUM(CASE WHEN DATE(revenue_reports.created_at) = ? THEN estimate_earning ELSE 0 END), 0) as yesterday_revenue,
                COALESCE(SUM(estimate_earning), 0) as monthly_revenue
            ', [$today, $yesterday])
            ->groupBy('revenue_campaigns.created_by');

        $ownership = OwnershipFilter::forAuthUser();
        if (! $ownership->isAdmin()) {
            $query->whereIn('revenue_campaigns.created_by', $ownership->allowedUserIds());
        }

        return $query->get()->keyBy('user_id');
    }

    /**
     * Resolve `user_name` + `team_id` + `team_name` for every user that will appear in a row.
     * Primary team per user: leader > member > manager; ties broken by smallest team_id.
     *
     * @param  array<int, int>  $userIds
     * @return array<int, array{user_name: string, team_id: int, team_name: string}>
     */
    private function userInfo(array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        $realUserIds = array_values(array_filter($userIds, fn ($id) => $id !== 0));

        $names = $realUserIds !== []
            ? DB::table('users')->whereIn('id', $realUserIds)->pluck('name', 'id')
            : collect();

        $rolePriority = sprintf(
            "FIELD(tu.team_role, '%s', '%s', '%s')",
            TeamRole::LEADER->value,
            TeamRole::MEMBER->value,
            TeamRole::MANAGER->value,
        );

        $teamRows = DB::table('team_user as tu')
            ->join('teams as t', 't.id', '=', 'tu.team_id')
            ->whereIn('tu.user_id', $realUserIds)
            ->orderBy('tu.user_id')
            ->orderByRaw($rolePriority)
            ->orderBy('tu.team_id')
            ->select('tu.user_id', 'tu.team_id', 't.name as team_name')
            ->get();

        $primaryTeam = [];
        foreach ($teamRows as $row) {
            $primaryTeam[(int) $row->user_id] ??= [
                'team_id' => (int) $row->team_id,
                'team_name' => $row->team_name,
            ];
        }

        $result = [];
        foreach ($userIds as $uid) {
            $result[$uid] = $uid === 0
                ? ['user_name' => '(Unassigned)', 'team_id' => 0, 'team_name' => '(No team)']
                : [
                    'user_name' => $names[$uid] ?? '(Unknown)',
                    'team_id' => $primaryTeam[$uid]['team_id'] ?? 0,
                    'team_name' => $primaryTeam[$uid]['team_name'] ?? '(No team)',
                ];
        }

        return $result;
    }

    /**
     * Merge spend and revenue per user into a single flat row carrying team context.
     *
     * @param  array<int, int>  $userIds
     * @param  array<int, array{user_name: string, team_id: int, team_name: string}>  $userInfo
     */
    private function buildUserRows(
        array $userIds,
        Collection $spendByUser,
        Collection $revenueByUser,
        array $userInfo,
    ): Collection {
        return collect($userIds)->map(function (int $userId) use ($spendByUser, $revenueByUser, $userInfo) {
            $spend = $spendByUser->get($userId);
            $revenue = $revenueByUser->get($userId);
            $info = $userInfo[$userId] ?? ['user_name' => '(Unknown)', 'team_id' => 0, 'team_name' => '(No team)'];

            return [
                'user_id' => $userId,
                'user_name' => $info['user_name'],
                'team_id' => $info['team_id'],
                'team_name' => $info['team_name'],
                'daily_revenue' => (float) ($revenue?->daily_revenue ?? 0),
                'daily_spend' => (float) ($spend?->daily_spend ?? 0),
                'yesterday_revenue' => (float) ($revenue?->yesterday_revenue ?? 0),
                'yesterday_spend' => (float) ($spend?->yesterday_spend ?? 0),
                'monthly_revenue' => (float) ($revenue?->monthly_revenue ?? 0),
                'monthly_spend' => (float) ($spend?->monthly_spend ?? 0),
            ];
        });
    }

    private function byTeam(Collection $userRows): Collection
    {
        return $userRows
            ->groupBy('team_id')
            ->map(function (Collection $rows) {
                $first = $rows->first();

                $dailyRevenue = (float) $rows->sum('daily_revenue');
                $dailySpend = (float) $rows->sum('daily_spend');
                $dailyProfit = $dailyRevenue - $dailySpend;
                $dailyRoi = $dailySpend > 0 ? round(($dailyProfit / $dailySpend) * 100, 2) : 0.0;

                $yesterdayRevenue = (float) $rows->sum('yesterday_revenue');
                $yesterdaySpend = (float) $rows->sum('yesterday_spend');
                $yesterdayProfit = $yesterdayRevenue - $yesterdaySpend;
                $yesterdayRoi = $yesterdaySpend > 0 ? round(($yesterdayProfit / $yesterdaySpend) * 100, 2) : 0.0;

                $monthlyRevenue = (float) $rows->sum('monthly_revenue');
                $monthlySpend = (float) $rows->sum('monthly_spend');
                $monthlyProfit = $monthlyRevenue - $monthlySpend;
                $monthlyRoi = $monthlySpend > 0 ? round(($monthlyProfit / $monthlySpend) * 100, 2) : 0.0;

                return [
                    'team_id' => (int) $first['team_id'],
                    'team_name' => $first['team_name'],
                    'daily' => [
                        'revenue' => round($dailyRevenue, 2),
                        'spend' => round($dailySpend, 2),
                        'profit' => round($dailyProfit, 2),
                        'roi' => $dailyRoi,
                    ],
                    'yesterday' => [
                        'revenue' => round($yesterdayRevenue, 2),
                        'spend' => round($yesterdaySpend, 2),
                        'profit' => round($yesterdayProfit, 2),
                        'roi' => $yesterdayRoi,
                    ],
                    'monthly' => [
                        'revenue' => round($monthlyRevenue, 2),
                        'spend' => round($monthlySpend, 2),
                        'profit' => round($monthlyProfit, 2),
                        'roi' => $monthlyRoi,
                    ],
                ];
            })
            ->sortByDesc(fn ($row) => $row['monthly']['revenue'])
            ->values();
    }

    private function topUsers(Collection $userRows, int $limit): Collection
    {
        return $userRows
            ->map(function (array $row) {
                $dailyRevenue = $row['daily_revenue'];
                $dailySpend = $row['daily_spend'];
                $dailyProfit = $dailyRevenue - $dailySpend;
                $dailyRoi = $dailySpend > 0 ? round(($dailyProfit / $dailySpend) * 100, 2) : 0.0;

                $yesterdayRevenue = $row['yesterday_revenue'];
                $yesterdaySpend = $row['yesterday_spend'];
                $yesterdayProfit = $yesterdayRevenue - $yesterdaySpend;
                $yesterdayRoi = $yesterdaySpend > 0 ? round(($yesterdayProfit / $yesterdaySpend) * 100, 2) : 0.0;

                $monthlyRevenue = $row['monthly_revenue'];
                $monthlySpend = $row['monthly_spend'];
                $monthlyProfit = $monthlyRevenue - $monthlySpend;
                $monthlyRoi = $monthlySpend > 0 ? round(($monthlyProfit / $monthlySpend) * 100, 2) : 0.0;

                return [
                    'user_id' => $row['user_id'],
                    'user_name' => $row['user_name'],
                    'team_id' => $row['team_id'],
                    'team_name' => $row['team_name'],
                    'daily' => [
                        'revenue' => round($dailyRevenue, 2),
                        'spend' => round($dailySpend, 2),
                        'profit' => round($dailyProfit, 2),
                        'roi' => $dailyRoi,
                    ],
                    'yesterday' => [
                        'revenue' => round($yesterdayRevenue, 2),
                        'spend' => round($yesterdaySpend, 2),
                        'profit' => round($yesterdayProfit, 2),
                        'roi' => $yesterdayRoi,
                    ],
                    'monthly' => [
                        'revenue' => round($monthlyRevenue, 2),
                        'spend' => round($monthlySpend, 2),
                        'profit' => round($monthlyProfit, 2),
                        'roi' => $monthlyRoi,
                    ],
                ];
            })
            ->sortByDesc(fn ($row) => $row['monthly']['revenue'] - $row['monthly']['spend'])
            ->take($limit)
            ->values();
    }

    private function mainTeamRows(Carbon $now, int $limit): Collection
    {
        $spend = $this->mainTeamSpend($now);
        $revenue = $this->mainTeamRevenue($now);

        $teamIds = $spend->keys()
            ->merge($revenue->keys())
            ->unique()
            ->map(fn ($id) => (int) $id)
            ->filter(fn (int $id) => $id > 0)
            ->values();

        if ($teamIds->isEmpty()) {
            return collect();
        }

        $names = DB::table('main_teams')
            ->whereIn('id', $teamIds->all())
            ->pluck('name', 'id');

        return $teamIds->map(function (int $teamId) use ($spend, $revenue, $names) {
            $spendRow = $spend->get($teamId);
            $revenueRow = $revenue->get($teamId);

            return [
                'main_team_id' => $teamId,
                'main_team_name' => $names[$teamId] ?? '(Unknown)',
                'today' => $this->stats(
                    (float) ($revenueRow?->today_revenue ?? 0),
                    (float) ($spendRow?->today_spend ?? 0),
                ),
                'yesterday' => $this->stats(
                    (float) ($revenueRow?->yesterday_revenue ?? 0),
                    (float) ($spendRow?->yesterday_spend ?? 0),
                ),
                'this_month' => $this->stats(
                    (float) ($revenueRow?->this_month_revenue ?? 0),
                    (float) ($spendRow?->this_month_spend ?? 0),
                ),
                'last_month' => $this->stats(
                    (float) ($revenueRow?->last_month_revenue ?? 0),
                    (float) ($spendRow?->last_month_spend ?? 0),
                ),
            ];
        })
            ->sortByDesc(fn ($row) => $row['this_month']['profit'])
            ->take($limit)
            ->values();
    }

    private function mainTeamSpend(Carbon $now): Collection
    {
        $today = $now->toDateString();
        $yesterday = $now->copy()->subDay()->toDateString();
        $thisMonthFrom = $now->copy()->startOfMonth()->toDateString();
        $thisMonthTo = $now->copy()->endOfMonth()->toDateString();
        $lastMonthFrom = $now->copy()->subMonthNoOverflow()->startOfMonth()->toDateString();
        $lastMonthTo = $now->copy()->subMonthNoOverflow()->endOfMonth()->toDateString();

        return InsightReport::query()
            ->whereNotNull('owner_main_team_id')
            ->whereDate('date_start', '>=', $lastMonthFrom)
            ->whereDate('date_start', '<=', $thisMonthTo)
            ->groupBy('owner_main_team_id')
            ->selectRaw('
                owner_main_team_id as main_team_id,
                COALESCE(SUM(CASE WHEN date_start = ? THEN spend ELSE 0 END), 0) as today_spend,
                COALESCE(SUM(CASE WHEN date_start = ? THEN spend ELSE 0 END), 0) as yesterday_spend,
                COALESCE(SUM(CASE WHEN date_start >= ? AND date_start <= ? THEN spend ELSE 0 END), 0) as this_month_spend,
                COALESCE(SUM(CASE WHEN date_start >= ? AND date_start <= ? THEN spend ELSE 0 END), 0) as last_month_spend
            ', [$today, $yesterday, $thisMonthFrom, $thisMonthTo, $lastMonthFrom, $lastMonthTo])
            ->get()
            ->keyBy('main_team_id');
    }

    private function mainTeamRevenue(Carbon $now): Collection
    {
        $today = $now->toDateString();
        $yesterday = $now->copy()->subDay()->toDateString();
        $thisMonthFrom = $now->copy()->startOfMonth()->toDateString();
        $thisMonthTo = $now->copy()->endOfMonth()->toDateString();
        $lastMonthFrom = $now->copy()->subMonthNoOverflow()->startOfMonth()->toDateString();
        $lastMonthTo = $now->copy()->subMonthNoOverflow()->endOfMonth()->toDateString();

        return RevenueReport::query()
            ->join('campaigns as revenue_campaigns', 'revenue_campaigns.campaign_id', '=', 'revenue_reports.campaign_id')
            ->join('accounts as revenue_accounts', 'revenue_accounts.account_id', '=', 'revenue_campaigns.account_id')
            ->whereNotNull('revenue_accounts.main_team_id')
            ->whereDate('revenue_reports.created_at', '>=', $lastMonthFrom)
            ->whereDate('revenue_reports.created_at', '<=', $thisMonthTo)
            ->groupBy('revenue_accounts.main_team_id')
            ->selectRaw('
                revenue_accounts.main_team_id as main_team_id,
                COALESCE(SUM(CASE WHEN DATE(revenue_reports.created_at) = ? THEN estimate_earning ELSE 0 END), 0) as today_revenue,
                COALESCE(SUM(CASE WHEN DATE(revenue_reports.created_at) = ? THEN estimate_earning ELSE 0 END), 0) as yesterday_revenue,
                COALESCE(SUM(CASE WHEN DATE(revenue_reports.created_at) >= ? AND DATE(revenue_reports.created_at) <= ? THEN estimate_earning ELSE 0 END), 0) as this_month_revenue,
                COALESCE(SUM(CASE WHEN DATE(revenue_reports.created_at) >= ? AND DATE(revenue_reports.created_at) <= ? THEN estimate_earning ELSE 0 END), 0) as last_month_revenue
            ', [$today, $yesterday, $thisMonthFrom, $thisMonthTo, $lastMonthFrom, $lastMonthTo])
            ->get()
            ->keyBy('main_team_id');
    }

    private function stats(float $revenue, float $spend): array
    {
        $profit = $revenue - $spend;

        return [
            'revenue' => round($revenue, 2),
            'spend' => round($spend, 2),
            'profit' => round($profit, 2),
            'roi' => $spend > 0 ? round(($profit / $spend) * 100, 2) : 0.0,
        ];
    }
}

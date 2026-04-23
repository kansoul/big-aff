<?php

namespace App\Actions\Dashboard;

use App\Enums\Permission;
use App\Enums\TeamRole;
use App\Models\InsightReport;
use App\Models\RevenueReport;
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
 *   - Each channel is attributed to a single "primary" user = MIN(user_id) on channel_user.
 *   - Each user is attributed to a single "primary" team by role priority:
 *     leader > member > manager. Users not in any team → "(No team)".
 */
class GetRevenueTableAction
{
    public function execute(array $filters): array
    {
        $ownership = OwnershipFilter::forAuthUser();
        $now = Carbon::now();
        $limit = min((int) ($filters['top_limit'] ?? 10), 50);

        $spendByUser = $this->spendByUser($ownership, $now);
        $revenueByUser = $this->revenueByUser($ownership, $now);

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
        ];
    }

    /**
     * Spend per user for the current month.
     *
     *   aggregate spend per account → attribute each account to its primary user
     *   (MIN user_id on account_user) → aggregate per user.
     */
    private function spendByUser(OwnershipFilter $ownership, Carbon $now): Collection
    {
        $from = $now->copy()->startOfMonth()->toDateString();
        $to = $now->copy()->endOfMonth()->toDateString();
        $today = $now->toDateString();

        $perAccount = InsightReport::query()
            ->whereDate('date_start', '>=', $from)
            ->whereDate('date_start', '<=', $to)
            ->selectRaw('
                account_id,
                COALESCE(SUM(CASE WHEN date_start = ? THEN spend ELSE 0 END), 0) as daily_spend,
                COALESCE(SUM(spend), 0) as monthly_spend
            ', [$today])
            ->groupBy('account_id');

        $ownership->applyThroughAccount($perAccount);

        // insight_reports.account_id stores the business string ID (e.g. act_xxx),
        // so we resolve each account's primary user via accounts.account_id (string).
        $primaryUserPerAccount = DB::table('account_user')
            ->join('accounts', 'accounts.id', '=', 'account_user.account_id')
            ->selectRaw('accounts.account_id as account_id, MIN(account_user.user_id) as user_id')
            ->groupBy('accounts.account_id');

        return DB::query()
            ->fromSub($perAccount, 'ir')
            ->joinSub($primaryUserPerAccount, 'pu', 'pu.account_id', '=', 'ir.account_id')
            ->groupBy('pu.user_id')
            ->selectRaw('
                pu.user_id as user_id,
                COALESCE(SUM(ir.daily_spend), 0) as daily_spend,
                COALESCE(SUM(ir.monthly_spend), 0) as monthly_spend
            ')
            ->get()
            ->keyBy('user_id');
    }

    /**
     * Revenue per user for the current month. Mirrors spendByUser but over channels.
     */
    private function revenueByUser(OwnershipFilter $ownership, Carbon $now): Collection
    {
        $from = $now->copy()->startOfMonth()->toDateString();
        $to = $now->copy()->endOfMonth()->toDateString();
        $today = $now->toDateString();

        $perChannel = RevenueReport::query()
            ->whereDate('date', '>=', $from)
            ->whereDate('date', '<=', $to)
            ->selectRaw('
                channel_code,
                COALESCE(SUM(CASE WHEN date = ? THEN estimated_earnings ELSE 0 END), 0) as daily_revenue,
                COALESCE(SUM(estimated_earnings), 0) as monthly_revenue
            ', [$today])
            ->groupBy('channel_code');

        $ownership->applyThroughChannel($perChannel);

        $primaryUserPerChannel = DB::table('channel_user')
            ->join('channels', 'channels.id', '=', 'channel_user.channel_id')
            ->selectRaw('channels.code as channel_code, MIN(channel_user.user_id) as user_id')
            ->groupBy('channels.code');

        return DB::query()
            ->fromSub($perChannel, 'rr')
            ->joinSub($primaryUserPerChannel, 'pu', 'pu.channel_code', '=', 'rr.channel_code')
            ->groupBy('pu.user_id')
            ->selectRaw('
                pu.user_id as user_id,
                COALESCE(SUM(rr.daily_revenue), 0) as daily_revenue,
                COALESCE(SUM(rr.monthly_revenue), 0) as monthly_revenue
            ')
            ->get()
            ->keyBy('user_id');
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

        $names = DB::table('users')
            ->whereIn('id', $userIds)
            ->pluck('name', 'id');

        $rolePriority = sprintf(
            "FIELD(tu.team_role, '%s', '%s', '%s')",
            TeamRole::LEADER->value,
            TeamRole::MEMBER->value,
            TeamRole::MANAGER->value,
        );

        $teamRows = DB::table('team_user as tu')
            ->join('teams as t', 't.id', '=', 'tu.team_id')
            ->whereIn('tu.user_id', $userIds)
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
            $result[$uid] = [
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
}

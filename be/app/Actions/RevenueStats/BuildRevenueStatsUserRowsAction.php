<?php

namespace App\Actions\RevenueStats;

use App\Enums\TeamRole;
use App\Models\InsightReport;
use App\Models\RevenueReport;
use App\Support\MainTeam\MainTeamReportDataScope;
use App\Support\OwnershipFilter\OwnershipFilter;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class BuildRevenueStatsUserRowsAction
{
    /**
     * @param  array{
     *     date_from?: string|null,
     *     date_to?: string|null,
     *     team_ids?: int[]|null,
     *     user_ids?: int[]|null,
     *     main_team_ids?: int[]|null,
     *     account_ids?: int[]|null,
     *     channel_codes?: string[]|null
     * }  $filters
     * @return Collection<int, array{
     *     user_id: int,
     *     user_name: string,
     *     team_id: int,
     *     team_name: string,
     *     revenue: float,
     *     spend: float,
     *     profit: float
     * }>
     */
    public function execute(array $filters, bool $skipMainTeamScope = false): Collection
    {
        $spendByUser = $this->spendByUser($filters, $skipMainTeamScope);
        $revenueByUser = $this->revenueByUser($filters, $skipMainTeamScope);

        $userIds = $spendByUser->keys()
            ->merge($revenueByUser->keys())
            ->unique()
            ->map(fn ($id) => (int) $id)
            ->values();

        if ($userIds->isEmpty()) {
            return collect();
        }

        $userInfo = $this->userInfo($userIds->all());

        return $userIds
            ->map(function (int $userId) use ($spendByUser, $revenueByUser, $userInfo) {
                $spend = (float) ($spendByUser->get($userId)?->spend ?? 0);
                $revenue = (float) ($revenueByUser->get($userId)?->revenue ?? 0);

                return [
                    'user_id' => $userId,
                    'user_name' => $userInfo[$userId]['user_name'] ?? '(Unknown)',
                    'team_id' => $userInfo[$userId]['team_id'] ?? 0,
                    'team_name' => $userInfo[$userId]['team_name'] ?? '(No team)',
                    'revenue' => round($revenue, 2),
                    'spend' => round($spend, 2),
                    'profit' => round($revenue - $spend, 2),
                ];
            })
            ->when(
                ! empty($filters['team_ids']),
                fn (Collection $rows) => $rows->whereIn('team_id', $filters['team_ids']),
            )
            ->when(
                ! empty($filters['user_ids']),
                fn (Collection $rows) => $rows->whereIn('user_id', $filters['user_ids']),
            )
            ->values();
    }

    /**
     * @param  array{
     *     date_from?: string|null,
     *     date_to?: string|null,
     *     main_team_ids?: int[]|null,
     *     account_ids?: int[]|null
     * }  $filters
     */
    private function spendByUser(array $filters, bool $skipMainTeamScope = false): Collection
    {
        $query = InsightReport::query()
            ->when(
                ! empty($filters['date_from']),
                fn ($q) => $q->whereDate('date_start', '>=', Carbon::parse($filters['date_from'])->toDateString())
            )
            ->when(
                ! empty($filters['date_to']),
                fn ($q) => $q->whereDate('date_start', '<=', Carbon::parse($filters['date_to'])->toDateString())
            )
            ->when(
                ! empty($filters['account_ids']),
                fn ($q) => $q->whereIn('account_id', function ($sub) use ($filters) {
                    $sub->select('account_id')->from('accounts')->whereIn('id', $filters['account_ids']);
                })
            )
            ->when(
                config('main_system.is_main') && ! empty($filters['main_team_ids']),
                fn ($q) => $q->whereIn('owner_main_team_id', $filters['main_team_ids'])
            )
            ->when(
                config('main_system.is_main') && ! $skipMainTeamScope,
                fn ($q) => MainTeamReportDataScope::excludeNonFetchableAccounts($q)
            )
            ->whereNotNull('owner_user_id')
            ->selectRaw('owner_user_id as user_id, COALESCE(SUM(spend), 0) as spend')
            ->groupBy('owner_user_id');

        OwnershipFilter::forAuthUser()->applyTo($query, 'owner_user_id');

        return $query->get()->keyBy('user_id');
    }

    /**
     * @param  array{
     *     date_from?: string|null,
     *     date_to?: string|null,
     *     main_team_ids?: int[]|null,
     *     channel_codes?: string[]|null
     * }  $filters
     */
    private function revenueByUser(array $filters, bool $skipMainTeamScope = false): Collection
    {
        $query = RevenueReport::query()
            ->join('campaigns as revenue_campaigns', 'revenue_campaigns.campaign_id', '=', 'revenue_reports.campaign_id')
            ->when(
                ! empty($filters['date_from']),
                fn ($q) => $q->whereDate('revenue_reports.created_at', '>=', Carbon::parse($filters['date_from'])->toDateString())
            )
            ->when(
                ! empty($filters['date_to']),
                fn ($q) => $q->whereDate('revenue_reports.created_at', '<=', Carbon::parse($filters['date_to'])->toDateString())
            )
            ->whereNotNull('revenue_campaigns.created_by')
            ->selectRaw('revenue_campaigns.created_by as user_id, COALESCE(SUM(revenue_reports.revenue), 0) as revenue')
            ->groupBy('revenue_campaigns.created_by');

        $ownership = OwnershipFilter::forAuthUser();
        if (! $ownership->isAdmin()) {
            $query->whereIn('revenue_campaigns.created_by', $ownership->allowedUserIds());
        }

        return $query->get()->keyBy('user_id');
    }

    /**
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
}

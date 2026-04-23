<?php

namespace App\Actions\RevenueStats;

use App\Enums\TeamRole;
use App\Models\InsightReport;
use App\Models\RevenueReport;
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
    public function execute(array $filters): Collection
    {
        $ownership = OwnershipFilter::forAuthUser();
        $spendByUser = $this->spendByUser($filters, $ownership);
        $revenueByUser = $this->revenueByUser($filters, $ownership);

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
     *     account_ids?: int[]|null
     * }  $filters
     */
    private function spendByUser(array $filters, OwnershipFilter $ownership): Collection
    {
        $perAccount = InsightReport::query()
            ->when(
                ! empty($filters['date_from']),
                fn ($query) => $query->whereDate('date_start', '>=', Carbon::parse($filters['date_from'])->toDateString())
            )
            ->when(
                ! empty($filters['date_to']),
                fn ($query) => $query->whereDate('date_start', '<=', Carbon::parse($filters['date_to'])->toDateString())
            )
            ->when(
                ! empty($filters['account_ids']),
                function ($query) use ($filters) {
                    $query->whereIn('account_id', function ($subquery) use ($filters) {
                        $subquery->select('account_id')
                            ->from('accounts')
                            ->whereIn('id', $filters['account_ids']);
                    });
                }
            )
            ->selectRaw('account_id, COALESCE(SUM(spend), 0) as spend')
            ->groupBy('account_id');

        $ownership->applyThroughAccount($perAccount);

        $primaryUserPerAccount = DB::table('account_user')
            ->join('accounts', 'accounts.id', '=', 'account_user.account_id')
            ->selectRaw('accounts.account_id as account_id, MIN(account_user.user_id) as user_id')
            ->groupBy('accounts.account_id');

        return DB::query()
            ->fromSub($perAccount, 'ir')
            ->joinSub($primaryUserPerAccount, 'pu', 'pu.account_id', '=', 'ir.account_id')
            ->groupBy('pu.user_id')
            ->selectRaw('pu.user_id as user_id, COALESCE(SUM(ir.spend), 0) as spend')
            ->get()
            ->keyBy('user_id');
    }

    /**
     * @param  array{
     *     date_from?: string|null,
     *     date_to?: string|null,
     *     channel_codes?: string[]|null
     * }  $filters
     */
    private function revenueByUser(array $filters, OwnershipFilter $ownership): Collection
    {
        $perChannel = RevenueReport::query()
            ->when(
                ! empty($filters['date_from']),
                fn ($query) => $query->whereDate('date', '>=', Carbon::parse($filters['date_from'])->toDateString())
            )
            ->when(
                ! empty($filters['date_to']),
                fn ($query) => $query->whereDate('date', '<=', Carbon::parse($filters['date_to'])->toDateString())
            )
            ->when(
                ! empty($filters['channel_codes']),
                fn ($query) => $query->whereIn('channel_code', $filters['channel_codes'])
            )
            ->selectRaw('channel_code, COALESCE(SUM(estimated_earnings), 0) as revenue')
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
            ->selectRaw('pu.user_id as user_id, COALESCE(SUM(rr.revenue), 0) as revenue')
            ->get()
            ->keyBy('user_id');
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

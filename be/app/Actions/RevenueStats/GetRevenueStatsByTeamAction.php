<?php

namespace App\Actions\RevenueStats;

use Illuminate\Support\Collection;

class GetRevenueStatsByTeamAction
{
    public function __construct(
        private readonly BuildRevenueStatsUserRowsAction $buildRevenueStatsUserRowsAction,
    ) {}

    /**
     * @param  array{
     *     date_from?: string|null,
     *     date_to?: string|null,
     *     team_ids?: int[]|null,
     *     user_ids?: int[]|null,
     *     account_ids?: int[]|null,
     *     channel_codes?: string[]|null
     * }  $filters
     */
    public function execute(array $filters): Collection
    {
        return $this->buildRevenueStatsUserRowsAction->execute($filters)
            ->groupBy('team_id')
            ->map(function (Collection $rows) {
                $first = $rows->first();
                $revenue = (float) $rows->sum('revenue');
                $spend = (float) $rows->sum('spend');
                $profit = $revenue - $spend;
                $roi = $spend > 0 ? round(($profit / $spend) * 100, 2) : 0.0;

                return (object) [
                    'team_id' => (int) ($first['team_id'] ?? 0),
                    'team_name' => $first['team_name'] ?? '(No team)',
                    'revenue' => round($revenue, 2),
                    'spend' => round($spend, 2),
                    'profit' => round($profit, 2),
                    'roi' => $roi,
                ];
            })
            ->sortByDesc('revenue')
            ->values();
    }
}

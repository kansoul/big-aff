<?php

namespace App\Actions\RevenueStats;

use Illuminate\Support\Collection;

class GetRevenueStatsByUserAction
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
            ->sortByDesc('profit')
            ->map(function (array $row) {
                $roi = $row['spend'] > 0 ? round(($row['profit'] / $row['spend']) * 100, 2) : 0.0;

                return (object) array_merge($row, ['roi' => $roi]);
            })
            ->values();
    }
}

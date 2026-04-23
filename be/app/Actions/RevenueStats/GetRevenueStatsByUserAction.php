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
            ->map(fn (array $row) => (object) $row)
            ->values();
    }
}

<?php

namespace App\Services\RevenueStats;

use App\Actions\RevenueStats\GetRevenueStatsByTeamAction;
use App\Actions\RevenueStats\GetRevenueStatsByUserAction;
use App\Actions\RevenueStats\GetRevenueStatsOverviewAction;
use Illuminate\Support\Collection;

class RevenueStatsService
{
    public function __construct(
        private readonly GetRevenueStatsOverviewAction $getRevenueStatsOverviewAction,
        private readonly GetRevenueStatsByTeamAction $getRevenueStatsByTeamAction,
        private readonly GetRevenueStatsByUserAction $getRevenueStatsByUserAction,
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
     * @return array{revenue: float, spend: float, profit: float, roi: float}
     */
    public function overview(array $filters): array
    {
        return $this->getRevenueStatsOverviewAction->execute($filters);
    }

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
    public function byTeam(array $filters): Collection
    {
        return $this->getRevenueStatsByTeamAction->execute($filters);
    }

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
    public function byUser(array $filters): Collection
    {
        return $this->getRevenueStatsByUserAction->execute($filters);
    }
}

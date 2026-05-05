<?php

namespace App\Actions\RevenueStats;

class GetRevenueStatsOverviewAction
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
     *     main_team_ids?: int[]|null,
     *     account_ids?: int[]|null,
     *     channel_codes?: string[]|null
     * }  $filters
     * @return array{revenue: float, spend: float, profit: float, roi: float}
     */
    public function execute(array $filters): array
    {
        $rows = $this->buildRevenueStatsUserRowsAction->execute($filters);
        $revenue = (float) $rows->sum('revenue');
        $spend = (float) $rows->sum('spend');
        $profit = $revenue - $spend;
        $roi = $spend > 0 ? ($profit / $spend) * 100 : 0;

        return [
            'revenue' => round($revenue, 2),
            'spend' => round($spend, 2),
            'profit' => round($profit, 2),
            'roi' => round($roi, 2),
        ];
    }
}

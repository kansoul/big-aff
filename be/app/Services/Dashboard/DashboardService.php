<?php

namespace App\Services\Dashboard;

use App\Actions\Dashboard\GetInsightChartAction;
use App\Actions\Dashboard\GetRevenueTableAction;

class DashboardService
{
    public function __construct(
        private readonly GetInsightChartAction $getInsightChartAction,
        private readonly GetRevenueTableAction $getRevenueTableAction,
    ) {}

    public function insightStats(array $filters = []): array
    {
        return $this->getInsightChartAction->execute($filters['month'] ?? null);
    }

    public function revenueTable(array $filters): array
    {
        return $this->getRevenueTableAction->execute($filters);
    }
}

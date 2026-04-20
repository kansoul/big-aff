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

    public function insightStats(): array
    {
        return $this->getInsightChartAction->execute();
    }

    public function revenueTable(array $filters): array
    {
        return $this->getRevenueTableAction->execute($filters);
    }
}

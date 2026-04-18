<?php

namespace App\Services\RevenueChartReport;

use App\Actions\RevenueChartReport\GetRevenueChartReportAction;

class RevenueChartReportService
{
    public function __construct(
        private readonly GetRevenueChartReportAction $getRevenueChartReportAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function chart(array $filters): array
    {
        return $this->getRevenueChartReportAction->execute($filters);
    }
}

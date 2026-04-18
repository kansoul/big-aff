<?php

namespace App\Services\RevenueChartReport;

use App\Actions\RevenueChartReport\GetRevenueChartReportAction;
use App\Actions\RevenueChartReport\ListRevenueChartReportsAction;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class RevenueChartReportService
{
    public function __construct(
        private readonly GetRevenueChartReportAction $getRevenueChartReportAction,
        private readonly ListRevenueChartReportsAction $listRevenueChartReportsAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function chart(array $filters): array
    {
        return $this->getRevenueChartReportAction->execute($filters);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listRevenueChartReportsAction->execute($filters);
    }
}

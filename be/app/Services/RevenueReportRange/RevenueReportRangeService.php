<?php

namespace App\Services\RevenueReportRange;

use App\Actions\RevenueReportRange\GetRevenueReportRangeAction;

class RevenueReportRangeService
{
    public function __construct(
        private readonly GetRevenueReportRangeAction $getRevenueReportRangeAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return list<array<string, mixed>>
     */
    public function query(array $filters): array
    {
        return $this->getRevenueReportRangeAction->execute($filters);
    }
}

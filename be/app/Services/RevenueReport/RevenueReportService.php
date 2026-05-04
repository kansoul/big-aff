<?php

namespace App\Services\RevenueReport;

use App\Actions\RevenueReport\ListRevenueReportsAction;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class RevenueReportService
{
    public function __construct(
        private readonly ListRevenueReportsAction $listRevenueReportsAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return array{paginator: LengthAwarePaginator, summary: array<string, mixed>}
     */
    public function list(array $filters): array
    {
        return $this->listRevenueReportsAction->execute($filters);
    }
}

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
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listRevenueReportsAction->execute($filters);
    }
}

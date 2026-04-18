<?php

namespace App\Services\StyleReportRange;

use App\Actions\StyleReportRange\GetStyleReportRangeAction;

class StyleReportRangeService
{
    public function __construct(
        private readonly GetStyleReportRangeAction $getStyleReportRangeAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return list<array<string, mixed>>
     */
    public function query(array $filters): array
    {
        return $this->getStyleReportRangeAction->execute($filters);
    }
}

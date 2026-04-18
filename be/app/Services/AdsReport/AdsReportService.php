<?php

namespace App\Services\AdsReport;

use App\Actions\AdsReport\GetAdsReportStatsAction;

class AdsReportService
{
    public function __construct(
        private readonly GetAdsReportStatsAction $getAdsReportStatsAction,
    ) {}

    public function stats(array $filters): array
    {
        return $this->getAdsReportStatsAction->execute($filters);
    }
}

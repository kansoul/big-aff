<?php

namespace App\Services\AnalyticsTracking;

use App\Actions\AnalyticsTracking\GetAnalyticsStatsAction;
use App\Actions\AnalyticsTracking\GetAnalyticsTrackingFilterOptionsAction;
use App\Actions\AnalyticsTracking\ListKeywordTrackingAction;
use Illuminate\Pagination\LengthAwarePaginator;

class AnalyticsTrackingService
{
    public function __construct(
        private readonly GetAnalyticsStatsAction $getAnalyticsStatsAction,
        private readonly ListKeywordTrackingAction $listKeywordTrackingAction,
        private readonly GetAnalyticsTrackingFilterOptionsAction $getFilterOptionsAction,
    ) {}

    public function stats(array $filters): array
    {
        return $this->getAnalyticsStatsAction->execute($filters);
    }

    public function keywords(array $filters): LengthAwarePaginator
    {
        return $this->listKeywordTrackingAction->execute($filters);
    }

    public function filterOptions(): array
    {
        return $this->getFilterOptionsAction->execute();
    }
}

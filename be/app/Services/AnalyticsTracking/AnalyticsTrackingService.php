<?php

namespace App\Services\AnalyticsTracking;

use App\Actions\AnalyticsTracking\GetAnalyticsStatsAction;
use App\Actions\AnalyticsTracking\ListKeywordTrackingAction;
use Illuminate\Pagination\LengthAwarePaginator;

class AnalyticsTrackingService
{
    public function __construct(
        private readonly GetAnalyticsStatsAction $getAnalyticsStatsAction,
        private readonly ListKeywordTrackingAction $listKeywordTrackingAction,
    ) {}

    public function stats(array $filters): array
    {
        return $this->getAnalyticsStatsAction->execute($filters);
    }

    public function keywords(array $filters): LengthAwarePaginator
    {
        return $this->listKeywordTrackingAction->execute($filters);
    }
}

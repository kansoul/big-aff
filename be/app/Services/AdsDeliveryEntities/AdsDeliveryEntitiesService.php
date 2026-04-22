<?php

namespace App\Services\AdsDeliveryEntities;

use App\Actions\AdsDeliveryEntities\GetAdsDeliveryEntitiesAction;
use App\Actions\AdsDeliveryEntities\ToggleAdsetStatusAction;
use App\Actions\AdsDeliveryEntities\ToggleAdStatusAction;
use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;

class AdsDeliveryEntitiesService
{
    public function __construct(
        private readonly GetAdsDeliveryEntitiesAction $getAdsDeliveryEntitiesAction,
        private readonly ToggleAdsetStatusAction $toggleAdsetStatusAction,
        private readonly ToggleAdStatusAction $toggleAdStatusAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function getByCampaignId(string $campaignId, array $filters): array
    {
        return $this->getAdsDeliveryEntitiesAction->execute($campaignId, $filters);
    }

    /**
     * Toggle adset status (ACTIVE/PAUSED).
     */
    public function toggleAdsetStatus(int $adsetInsightId, string $newStatus): AdsetInsightsReport
    {
        return $this->toggleAdsetStatusAction->execute($adsetInsightId, $newStatus);
    }

    /**
     * Toggle ad status (ACTIVE/PAUSED).
     */
    public function toggleAdStatus(int $adsInsightId, string $newStatus): AdsInsightsReport
    {
        return $this->toggleAdStatusAction->execute($adsInsightId, $newStatus);
    }
}

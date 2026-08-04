<?php

namespace App\Services\AdsDeliveryEntities;

use App\Actions\AdsDeliveryEntities\GetAdsDeliveryEntitiesAction;
use App\Actions\AdsDeliveryEntities\GetAdsDeliveryEntityStatusOptionsAction;
use App\Actions\AdsDeliveryEntities\GetAdsetDeliveryEntitiesAction;
use App\Actions\AdsDeliveryEntities\GetAdsOnlyDeliveryEntitiesAction;
use App\Actions\AdsDeliveryEntities\GetClickTrackingEntitiesAction;
use App\Actions\AdsDeliveryEntities\ToggleAdsetStatusAction;
use App\Actions\AdsDeliveryEntities\ToggleAdStatusAction;
use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
use App\Models\ClickTracking;
use Illuminate\Support\Collection;

class AdsDeliveryEntitiesService
{
    public function __construct(
        private readonly GetAdsDeliveryEntitiesAction $getAdsDeliveryEntitiesAction,
        private readonly GetAdsetDeliveryEntitiesAction $getAdsetDeliveryEntitiesAction,
        private readonly GetAdsOnlyDeliveryEntitiesAction $getAdsOnlyDeliveryEntitiesAction,
        private readonly GetClickTrackingEntitiesAction $getClickTrackingEntitiesAction,
        private readonly GetAdsDeliveryEntityStatusOptionsAction $getAdsDeliveryEntityStatusOptionsAction,
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
     * @param  array<string, mixed>  $filters
     * @return Collection<int, AdsetInsightsReport>
     */
    public function getAdsetsByCampaignId(string $campaignId, array $filters): Collection
    {
        return $this->getAdsetDeliveryEntitiesAction->execute($campaignId, $filters);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Collection<int, AdsInsightsReport>
     */
    public function getAdsByCampaignId(string $campaignId, array $filters): Collection
    {
        return $this->getAdsOnlyDeliveryEntitiesAction->execute($campaignId, $filters);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return Collection<int, ClickTracking>
     */
    public function getClicksByCampaignId(string $campaignId, array $filters): Collection
    {
        return $this->getClickTrackingEntitiesAction->execute($campaignId, $filters);
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public function getStatusOptions(): array
    {
        return $this->getAdsDeliveryEntityStatusOptionsAction->execute();
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

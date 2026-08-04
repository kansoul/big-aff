<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\AdsDeliveryEntities\GetAdsDeliveryEntitiesRequest;
use App\Http\Requests\AdsDeliveryEntities\ToggleDeliveryEntityStatusRequest;
use App\Http\Resources\AdsDeliveryEntities\AdsetInsightsReportResource;
use App\Http\Resources\AdsDeliveryEntities\AdsInsightsReportResource;
use App\Http\Resources\AdsDeliveryEntities\ClickTrackingResource;
use App\Services\AdsDeliveryEntities\AdsDeliveryEntitiesService;
use Illuminate\Http\JsonResponse;

/**
 * @tags Ads Delivery Entities
 */
class AdsDeliveryEntitiesController extends BaseController
{
    public function __construct(
        private readonly AdsDeliveryEntitiesService $service,
    ) {}

    /**
     * Status filter / display options for delivery entities (matches Filament adsets & ads tables).
     */
    public function statusOptions(): JsonResponse
    {
        return $this->sendResponse([
            'data' => [
                'statuses' => $this->service->getStatusOptions(),
            ],
        ]);
    }

    /**
     * Get saved adset and ads insight reports by campaign ID.
     *
     * @queryParam date_from string Start date (Y-m-d). Example: 2026-04-22
     * @queryParam date_to string End date (Y-m-d). Example: 2026-04-22
     * @queryParam created_time_from string Filter by created_time start (Y-m-d). Example: 2026-04-01
     * @queryParam created_time_to string Filter by created_time end (Y-m-d). Example: 2026-04-22
     * @queryParam status string Filter by status (e.g. ACTIVE, PAUSED). Example: ACTIVE
     * @queryParam adset_id string Search adsets by adset_id. Example: 12345
     * @queryParam adset_name string Search adsets by name. Example: My Adset
     * @queryParam ad_id string Search ads by ad_id. Example: 67890
     * @queryParam ad_name string Search ads by name. Example: My Ad
     */
    public function index(GetAdsDeliveryEntitiesRequest $request, string $campaignId): JsonResponse
    {
        $reports = $this->service->getByCampaignId($campaignId, $request->validated());

        return $this->sendResponse([
            'data' => [
                'adsets' => AdsetInsightsReportResource::collection($reports['adsets']),
                'ads' => AdsInsightsReportResource::collection($reports['ads']),
            ],
        ]);
    }

    /**
     * Get adset insight reports only by campaign ID.
     */
    public function adsets(GetAdsDeliveryEntitiesRequest $request, string $campaignId): JsonResponse
    {
        $adsets = $this->service->getAdsetsByCampaignId($campaignId, $request->validated());

        return $this->sendResponse([
            'data' => AdsetInsightsReportResource::collection($adsets),
        ]);
    }

    /**
     * Get ads insight reports only by campaign ID.
     */
    public function ads(GetAdsDeliveryEntitiesRequest $request, string $campaignId): JsonResponse
    {
        $ads = $this->service->getAdsByCampaignId($campaignId, $request->validated());

        return $this->sendResponse([
            'data' => AdsInsightsReportResource::collection($ads),
        ]);
    }

    /**
     * Get click tracking rows by campaign ID.
     */
    public function clicks(GetAdsDeliveryEntitiesRequest $request, string $campaignId): JsonResponse
    {
        $clicks = $this->service->getClicksByCampaignId($campaignId, $request->validated());

        return $this->sendResponse([
            'data' => ClickTrackingResource::collection($clicks),
        ]);
    }

    /**
     * Toggle adset status (ACTIVE/PAUSED).
     */
    public function toggleAdsetStatus(
        ToggleDeliveryEntityStatusRequest $request,
        int $adsetInsightId,
    ): JsonResponse {
        $adset = $this->service->toggleAdsetStatus($adsetInsightId, $request->validated('status'));

        return $this->sendResponse([
            'data' => new AdsetInsightsReportResource($adset),
        ]);
    }

    /**
     * Toggle ad status (ACTIVE/PAUSED).
     */
    public function toggleAdStatus(
        ToggleDeliveryEntityStatusRequest $request,
        int $adsInsightId,
    ): JsonResponse {
        $ad = $this->service->toggleAdStatus($adsInsightId, $request->validated('status'));

        return $this->sendResponse([
            'data' => new AdsInsightsReportResource($ad),
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\AnalyticsTracking\AnalyticsTrackingStatsRequest;
use App\Http\Requests\AnalyticsTracking\ListKeywordTrackingRequest;
use App\Http\Resources\AnalyticsTracking\KeywordTrackingResource;
use App\Services\AnalyticsTracking\AnalyticsTrackingService;
use Illuminate\Http\JsonResponse;

/**
 * @tags Analytics Tracking
 */
class AnalyticsTrackingController extends BaseController
{
    public function __construct(
        private readonly AnalyticsTrackingService $analyticsTrackingService,
    ) {}

    /**
     * Get analytics tracking filter options
     *
     * Returns available links and campaign IDs for filter dropdowns.
     *
     * @response 200 {"data": {"links": [...], "campaigns": [...]}}
     */
    public function filterOptions(): JsonResponse
    {
        return $this->sendResponse(['data' => $this->analyticsTrackingService->filterOptions()]);
    }

    /**
     * Get analytics tracking stats
     *
     * Returns aggregated views, clicks, and failed ad loads from event tables.
     *
     * @queryParam date_from string Start date (Y-m-d). Example: 2026-04-01
     * @queryParam date_to string End date (Y-m-d). Example: 2026-04-30
     * @queryParam link_id integer Filter by Link ID.
     * @queryParam campaign_id string Filter by campaign ID.
     *
     * @response 200 {"data": {"views": {...}, "clicks": {...}, "loads": {...}}}
     */
    public function stats(AnalyticsTrackingStatsRequest $request): JsonResponse
    {
        $result = $this->analyticsTrackingService->stats($request->validated());

        return $this->sendResponse(['data' => $result]);
    }

    /**
     * List keyword click tracking
     *
     * Returns paginated keyword click data grouped by keyword.
     *
     * @queryParam keyword string Search by keyword text.
     * @queryParam date_from string Start date (Y-m-d).
     * @queryParam date_to string End date (Y-m-d).
     * @queryParam link_id integer Filter by Link ID.
     * @queryParam campaign_id string Filter by campaign ID.
     * @queryParam sort_by string Column to sort by. Example: click_count
     * @queryParam sort_direction string asc or desc. Example: desc
     * @queryParam per_page integer Items per page. Example: 30
     * @queryParam page integer Page number. Example: 1
     *
     * @response 200 {"data": [...], "pagination": {"current_page": 1, "total": 50}}
     */
    public function keywords(ListKeywordTrackingRequest $request): JsonResponse
    {
        $paginator = $this->analyticsTrackingService->keywords($request->validated());

        return $this->sendResponse([
            'data' => KeywordTrackingResource::collection($paginator),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\API\BaseController;
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
     * Get analytics tracking stats
     *
     * Returns aggregated views and clicks from InsightReport.
     * Maps: search_views, article_views, ad_clicks (search ad clicks), search_clicks (article related clicks).
     *
     * @queryParam date_from string Start date (Y-m-d). Example: 2026-04-01
     * @queryParam date_to string End date (Y-m-d). Example: 2026-04-30
     * @queryParam account_id string Filter by account ID. Example: act_123456
     * @queryParam campaign_id string Filter by campaign ID.
     *
     * @response 200 {"data": {"views": [...], "clicks": [...]}}
     */
    public function stats(AnalyticsTrackingStatsRequest $request): JsonResponse
    {
        $result = $this->analyticsTrackingService->stats($request->validated());

        return $this->sendResponse(['data' => $result]);
    }

    /**
     * List keyword sets for tracking
     *
     * Returns paginated keyword sets (name, keywords array).
     * Replaces the old keyword click tracking — keyword performance is now managed via KeywordSet.
     *
     * @queryParam keyword string Search by keyword set name.
     * @queryParam date_from string Start date (Y-m-d).
     * @queryParam date_to string End date (Y-m-d).
     * @queryParam account_id string Filter by account ID.
     * @queryParam campaign_id string Filter by campaign ID.
     * @queryParam sort_by string Column to sort by. Example: name
     * @queryParam sort_direction string asc or desc. Example: desc
     * @queryParam per_page integer Items per page. Example: 15
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

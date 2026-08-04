<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\RevenueReport\ListRevenueReportsRequest;
use App\Http\Resources\RevenueReportResource;
use App\Services\RevenueReport\RevenueReportService;
use Illuminate\Http\JsonResponse;

/**
 * @tags Revenue Reports
 */
class RevenueReportController extends BaseController
{
    public function __construct(
        private readonly RevenueReportService $revenueReportService,
    ) {}

    /**
     * List revenue reports
     *
     * Return a paginated list of session revenue reports filtered by date range and campaign.
     *
     * @queryParam date_from string Filter records on or after this date (Y-m-d). Example: 2026-04-01
     * @queryParam date_to string Filter records on or before this date (Y-m-d). Example: 2026-04-30
     * @queryParam campaign_ids string[] Filter by one or more campaign IDs. Example: ["120123456789"]
     * @queryParam order_by string Column to sort by. Enum: id, session_id, campaign_id, adset_id, ad_id, click_id, estimate_earning, page_views, clicks, ad_requests, impressions, ad_requests_rpm, impressions_rpm, cost_per_click, funnel_requests, funnel_impressions, funnel_clicks, funnel_rpm, created_at. Example: created_at
     * @queryParam order string Sort direction. Enum: asc, desc. Example: desc
     * @queryParam per_page integer Items per page (max 100). Example: 15
     * @queryParam page integer Page number. Example: 1
     *
     * @response 200 {"data": [{"id": 1, "session_id": "8221dd25-394d-40b5-b983-8273f884f8cd", "campaign_id": "120123456789", "adset_id": "120223456789", "ad_id": "120323456789", "click_id": 42, "estimate_earning": 12.5, "page_views": 1000, "clicks": 50, "ad_requests": 900, "impressions": 800, "ad_requests_rpm": 13.88, "impressions_rpm": 15.62, "cost_per_click": 0.25, "funnel_requests": 100, "funnel_impressions": 80, "funnel_clicks": 10, "funnel_rpm": 156.25, "created_at": "2026-04-02T00:00:00+00:00", "updated_at": "2026-04-02T00:00:00+00:00"}], "pagination": {"total": 1, "per_page": 15, "current_page": 1, "last_page": 1}}
     */
    public function index(ListRevenueReportsRequest $request): JsonResponse
    {
        $result = $this->revenueReportService->list($request->validated());
        $paginator = $result['paginator'];

        return $this->sendResponse([
            'data' => RevenueReportResource::collection($paginator->items()),
            'summary' => $result['summary'],
            'pagination' => $this->parsePagination($paginator),
        ]);
    }
}

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
     * Return a paginated list of revenue reports filtered by date range, style, and channel.
     *
     * @queryParam date_from string Filter records on or after this date (Y-m-d). Example: 2026-04-01
     * @queryParam date_to string Filter records on or before this date (Y-m-d). Example: 2026-04-30
     * @queryParam style_codes string[] Filter by one or more style codes. Example: ["ABC123"]
     * @queryParam channel_codes string[] Filter by one or more channel codes. Example: ["CHAN1"]
     * @queryParam order_by string Column to sort by. Enum: id, date, style_code, channel_code, page_views, clicks, estimated_earnings, ad_requests, impressions, cost_per_click, funnel_requests, funnel_impressions, funnel_clicks, funnel_rpm, created_at. Example: date
     * @queryParam order string Sort direction. Enum: asc, desc. Example: desc
     * @queryParam per_page integer Items per page (max 100). Example: 15
     * @queryParam page integer Page number. Example: 1
     *
     * @response 200 {"data": [{"id": 1, "ad_client_id": "ca-pub-123", "style_code": "ABC", "style_name": "My Style", "channel_code": "CH1", "channel_name": "Channel 1", "date": "2026-04-01", "page_views": 1000, "clicks": 50, "estimated_earnings": 12.5, "ad_requests": 900, "impressions": 800, "ad_requests_rpm": 13.88, "impressions_rpm": 15.62, "cost_per_click": 0.25, "funnel_requests": null, "funnel_impressions": null, "funnel_clicks": null, "funnel_rpm": null, "created_at": "2026-04-02T00:00:00+00:00", "updated_at": "2026-04-02T00:00:00+00:00"}], "pagination": {"total": 1, "per_page": 15, "current_page": 1, "last_page": 1}}
     */
    public function index(ListRevenueReportsRequest $request): JsonResponse
    {
        $paginator = $this->revenueReportService->list($request->validated());

        return $this->sendResponse([
            'data' => RevenueReportResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }
}

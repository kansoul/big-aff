<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\RevenueChartReport\GetRevenueChartReportRequest;
use App\Http\Requests\RevenueChartReport\ListRevenueChartReportsRequest;
use App\Http\Resources\RevenueChartReportResource;
use App\Services\RevenueChartReport\RevenueChartReportService;
use Illuminate\Http\JsonResponse;

/**
 * @tags Revenue Chart Reports
 */
class RevenueChartReportController extends BaseController
{
    public function __construct(
        private readonly RevenueChartReportService $revenueChartReportService,
    ) {}

    /**
     * Get revenue chart data
     *
     * Return hourly chart data for a given metric and date range, grouped by style.
     *
     * @queryParam date_from string Start date (Y-m-d). Defaults to today. Example: 2026-04-18
     * @queryParam date_to string End date (Y-m-d). Defaults to today. Example: 2026-04-18
     * @queryParam style_codes string[] Filter by one or more style codes. Example: ["ABC123"]
     * @queryParam metric string Metric to chart. Enum: estimated_earnings, clicks, page_views, impressions, ad_requests, cost_per_click, ad_requests_rpm, impressions_rpm, funnel_requests, funnel_impressions, funnel_clicks, funnel_rpm. Example: estimated_earnings
     *
     * @response 200 {"data": {"metric": "estimated_earnings", "metric_label": "Estimated Earnings", "labels": ["08:00", "09:00"], "values": [1.25, 2.5], "stats": {"total": 3.75, "avg": 1.875, "max": 2.5, "min": 1.25, "count": 2}}}
     */
    /**
     * List revenue chart report table
     *
     * Return a paginated table of revenue chart reports with delta values computed via LAG window functions.
     *
     * @queryParam date_from string Start date (Y-m-d). Example: 2026-04-18
     * @queryParam date_to string End date (Y-m-d). Example: 2026-04-18
     * @queryParam interval string Time interval. Enum: 5m,15m,30m,1,2,3,4,6,12,24. Default: 1 (hourly). Example: 1
     * @queryParam style_codes string[] Filter by style codes (required — returns empty if omitted). Example: ["ABC123"]
     * @queryParam order_by string Column to sort by. Enum: id,datetime,style_code,style_name,created_at. Example: datetime
     * @queryParam order string Sort direction. Enum: asc,desc. Example: desc
     * @queryParam per_page integer Items per page (max 100). Example: 25
     * @queryParam page integer Page number. Example: 1
     */
    public function index(ListRevenueChartReportsRequest $request): JsonResponse
    {
        $paginator = $this->revenueChartReportService->list($request->validated());

        return $this->sendResponse([
            'data' => RevenueChartReportResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    public function chart(GetRevenueChartReportRequest $request): JsonResponse
    {
        $result = $this->revenueChartReportService->chart($request->validated());

        return $this->sendResponse(['data' => $result]);
    }
}

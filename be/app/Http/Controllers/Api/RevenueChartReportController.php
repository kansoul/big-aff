<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\API\BaseController;
use App\Http\Requests\RevenueChartReport\GetRevenueChartReportRequest;
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
    public function chart(GetRevenueChartReportRequest $request): JsonResponse
    {
        $result = $this->revenueChartReportService->chart($request->validated());

        return $this->sendResponse(['data' => $result]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\StyleReportRange\GetStyleReportRangeRequest;
use App\Services\StyleReportRange\StyleReportRangeService;
use Illuminate\Http\JsonResponse;

/**
 * @tags Style Report Range
 */
class StyleReportRangeController extends BaseController
{
    public function __construct(
        private readonly StyleReportRangeService $styleReportRangeService,
    ) {}

    /**
     * Query style report range data
     *
     * Return revenue and conversion data for each style across one or more time ranges.
     * Each range computes: real_revenue = revenue_end - revenue_start, real_conversion = clicks_end - clicks_start.
     *
     * @bodyParam ranges array required List of time ranges. Example: [{"start_date":"2026-04-18","start_time":"08:00","end_date":"2026-04-18","end_time":"09:00","style_codes":["ABC"]}]
     * @bodyParam ranges[].start_date string required Start date (Y-m-d). Example: 2026-04-18
     * @bodyParam ranges[].start_time string required Start time (H:i). Example: 08:00
     * @bodyParam ranges[].end_date string required End date (Y-m-d). Example: 2026-04-18
     * @bodyParam ranges[].end_time string required End time (H:i). Example: 09:00
     * @bodyParam ranges[].style_codes string[] required Style codes to include. Example: ["ABC"]
     *
     * @response 200 {"data": [{"range_label": "2026-04-18 08:00:00 - 2026-04-18 09:00:00", "style_code": "ABC", "style_name": "My Style", "revenue_start": 10.5, "revenue_end": 15.2, "real_revenue": 4.7, "conversion_start": 100, "conversion_end": 120, "real_conversion": 20, "real_rpc": 0.235, "cpc": 0.12}]}
     */
    public function query(GetStyleReportRangeRequest $request): JsonResponse
    {
        $data = $this->styleReportRangeService->query($request->validated());

        return $this->sendResponse(['data' => $data]);
    }
}

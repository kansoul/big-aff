<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\API\BaseController;
use App\Http\Requests\AdsReport\GetAdsReportStatsRequest;
use App\Services\AdsReport\AdsReportService;
use Illuminate\Http\JsonResponse;

/**
 * @tags Ads Report
 */
class AdsReportController extends BaseController
{
    public function __construct(
        private readonly AdsReportService $adsReportService,
    ) {}

    /**
     * Get ads report overview stats
     *
     * Returns campaign counts, spend by currency, total reach, and optionally
     * revenue and profit when no account/campaign filter is applied.
     *
     * @queryParam date_from string Start date (Y-m-d). Example: 2026-04-01
     * @queryParam date_to string End date (Y-m-d). Example: 2026-04-30
     * @queryParam team_id integer Filter by team ID. Example: 1
     * @queryParam ads_type string Filter by ads type (facebook|google). Example: facebook
     * @queryParam account_id string Filter by account ID. Example: act_123456
     * @queryParam campaign_ids[] string[] Filter by campaign IDs.
     *
     * @response 200 {"data": {"campaigns": {"total": 10, "active": 5, "paused": 3, "archived": 2}, "spend_by_currency": [{"currency": "USD", "amount": "1234.56"}], "total_reach": 500000, "show_revenue_profit": true, "revenue": "2345.67", "profit": "1111.11"}}
     */
    public function stats(GetAdsReportStatsRequest $request): JsonResponse
    {
        $result = $this->adsReportService->stats($request->validated());

        return $this->sendResponse(['data' => $result]);
    }
}

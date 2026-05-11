<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\GamAdx\GetGamAdxRevenueRequest;
use App\Services\GamAdx\GamAdxRevenueService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * @tags GAM AdX Revenue
 */
class GamAdxRevenueController extends BaseController
{
    public function __construct(
        private readonly GamAdxRevenueService $gamAdxRevenueService,
    ) {}

    /**
     * Get GAM AdX revenue
     *
     * Fetches Ad Exchange revenue from Google Ad Manager ReportService and returns normalized JSON for API consumers.
     *
     * @queryParam date_from string required Start date (Y-m-d). Example: 2026-05-01
     * @queryParam date_to string required End date (Y-m-d). Example: 2026-05-07
     * @queryParam dimensions string[] Optional breakdowns: date, site, channel, ad_unit, country, domain, demand_channel, ad_exchange_product, ad_type. Example: ["date","channel"]
     * @queryParam currency string Optional ISO currency code for reportCurrency. Example: USD
     *
     * @response 200 {"data": {"source": "google_ad_manager_adx", "date_from": "2026-05-01", "date_to": "2026-05-07", "currency": "USD", "dimensions": ["date"], "summary": {"row_count": 1, "ad_exchange_revenue": 12.34}, "rows": [{"dimensions": {"date": "2026-05-01"}, "ad_exchange_revenue": 12.34}]}}
     */
    public function revenue(GetGamAdxRevenueRequest $request): JsonResponse
    {
        try {
            $result = $this->gamAdxRevenueService->fetch($request->validated());
        } catch (Throwable $e) {
            Log::warning('[GAM AdX Revenue] Fetch failed', [
                'error' => $e->getMessage(),
            ]);

            return $this->sendError('Failed to fetch GAM AdX revenue.', [$e->getMessage()], 502);
        }

        return $this->sendResponse(['data' => $result]);
    }
}

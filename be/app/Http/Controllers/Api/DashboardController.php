<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Dashboard\InsightStatsRequest;
use App\Http\Requests\Dashboard\RevenueTableRequest;
use App\Services\Dashboard\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * @tags Dashboard
 */
class DashboardController extends BaseController
{
    public function __construct(
        private readonly DashboardService $dashboardService,
    ) {}

    /**
     * Insight stats — revenue & spend across daily / weekly / monthly periods
     *
     * Returns spend (from InsightReport) and revenue (from RevenueReport) for the
     * authenticated user and their children, compared across today/yesterday,
     * this week/last week, and this month/last month.
     *
     * @queryParam month string Optional month for monthly revenue/spend buckets, format YYYY-MM. Example: 2026-06
     *
     * @response 200 {
     *   "data": {
     *     "daily_spend":    {"today": 120.50, "yesterday": 98.30},
     *     "weekly_spend":   {"this_week": 850.00, "last_week": 720.00},
     *     "monthly_spend":  {"this_month": 3200.00, "last_month": 2900.00},
     *     "daily_revenue":  {"today": 200.00, "yesterday": 180.00},
     *     "weekly_revenue": {"this_week": 1400.00, "last_week": 1200.00},
     *     "monthly_revenue":{"this_month": 5600.00, "last_month": 4800.00}
     *   }
     * }
     */
    public function insightStats(InsightStatsRequest $request): JsonResponse
    {
        return $this->sendResponse(['data' => $this->dashboardService->insightStats($request->validated())]);
    }

    /**
     * Revenue table — admin only
     *
     * Returns two datasets restricted to admin users:
     * - `by_team`: revenue, spend, profit, ROI grouped by team (daily & monthly)
     * - `top_users`: top earners across all users ordered by monthly revenue descending
     *
     * @queryParam top_limit integer Max number of top users to return (1–50, default 10). Example: 10
     *
     * @response 200 {"data": {"by_team": [{"team_id": 1, "team_name": "Alpha", "daily": {"revenue": 500.00, "spend": 200.00, "profit": 300.00, "roi": 150.00}, "monthly": {"revenue": 5000.00, "spend": 2000.00, "profit": 3000.00, "roi": 150.00}}], "top_users": [{"user_id": 3, "user_name": "Alice", "team_id": 1, "team_name": "Alpha", "daily": {"revenue": 300.00, "spend": 120.00, "profit": 180.00, "roi": 150.00}, "monthly": {"revenue": 3000.00, "spend": 1200.00, "profit": 1800.00, "roi": 150.00}}]}}
     * @response 403 {"success": false, "message": "Forbidden.", "data": null}
     */
    public function revenueTable(RevenueTableRequest $request): JsonResponse
    {
        $result = $this->dashboardService->revenueTable($request->validated());

        return $this->sendResponse(['data' => $result]);
    }
}

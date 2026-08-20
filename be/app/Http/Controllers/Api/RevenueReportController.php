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
     * @queryParam order_by string Column to sort by. Enum: id, session_id, campaign_id, adset_id, ad_id, revenue, created_at, revenue_received_at. Example: created_at
     * @queryParam order string Sort direction. Enum: asc, desc. Example: desc
     * @queryParam per_page integer Items per page (max 100). Example: 15
     * @queryParam page integer Page number. Example: 1
     *
     * @response 200 {"data": [{"id": 1, "session_id": "8221dd25-394d-40b5-b983-8273f884f8cd", "campaign_id": "120123456789", "adset_id": "120223456789", "ad_id": "120323456789", "revenue": 12.5, "revenue_received_at": "2026-04-02T00:05:00+00:00", "created_at": "2026-04-02T00:00:00+00:00", "updated_at": "2026-04-02T00:05:00+00:00"}], "pagination": {"total": 1, "per_page": 15, "current_page": 1, "last_page": 1}}
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

<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\RevenueStats\RevenueStatsRequest;
use App\Http\Resources\RevenueStats\TeamRevenueResource;
use App\Http\Resources\RevenueStats\UserRevenueResource;
use App\Models\Team;
use App\Services\RevenueStats\RevenueStatsService;
use Illuminate\Http\JsonResponse;

/**
 * @tags Revenue Stats
 */
class RevenueStatsController extends BaseController
{
    public function __construct(
        private readonly RevenueStatsService $revenueStatsService,
    ) {}

    /**
     * Revenue stats overview
     *
     * Return aggregated revenue, spend, profit, and ROI totals.
     *
     * @queryParam date_from string Filter on or after this date (Y-m-d). Example: 2026-04-01
     * @queryParam date_to string Filter on or before this date (Y-m-d). Example: 2026-04-30
     * @queryParam team_ids int[] Filter by team IDs. Example: [1, 2]
     * @queryParam user_ids int[] Filter by user IDs. Example: [5]
     *
     * @response 200 {"data": {"revenue": 1200.50, "spend": 800.00, "profit": 400.50, "roi": 50.06}}
     */
    public function overview(RevenueStatsRequest $request): JsonResponse
    {
        $stats = $this->revenueStatsService->overview($request->validated());

        return $this->sendResponse(['data' => $stats]);
    }

    /**
     * Revenue stats by team
     *
     * Return revenue, spend, profit, and ROI grouped by team.
     *
     * @queryParam date_from string Filter on or after this date (Y-m-d). Example: 2026-04-01
     * @queryParam date_to string Filter on or before this date (Y-m-d). Example: 2026-04-30
     * @queryParam team_ids int[] Filter by team IDs. Example: [1, 2]
     * @queryParam user_ids int[] Filter by user IDs. Example: [5]
     *
     * @response 200 {"data": [{"team_id": 1, "team_name": "Alpha", "revenue": 600.00, "spend": 400.00, "profit": 200.00, "roi": 50.00}]}
     */
    public function byTeam(RevenueStatsRequest $request): JsonResponse
    {
        $rows = $this->revenueStatsService->byTeam($request->validated());

        return $this->sendResponse([
            'data' => TeamRevenueResource::collection($rows),
        ]);
    }

    /**
     * Revenue stats by user
     *
     * Return revenue, spend, profit, and ROI grouped by user and team.
     *
     * @queryParam date_from string Filter on or after this date (Y-m-d). Example: 2026-04-01
     * @queryParam date_to string Filter on or before this date (Y-m-d). Example: 2026-04-30
     * @queryParam team_ids int[] Filter by team IDs. Example: [1, 2]
     * @queryParam user_ids int[] Filter by user IDs. Example: [5]
     *
     * @response 200 {"data": [{"user_id": 5, "user_name": "Alice", "team_id": 1, "team_name": "Alpha", "revenue": 600.00, "spend": 400.00, "profit": 200.00, "roi": 50.00}]}
     */
    public function byUser(RevenueStatsRequest $request): JsonResponse
    {
        $rows = $this->revenueStatsService->byUser($request->validated());

        return $this->sendResponse([
            'data' => UserRevenueResource::collection($rows),
        ]);
    }

    public function teamOptions(): JsonResponse
    {
        return $this->sendResponse([
            'data' => $this->revenueStatsService->teamOptions(),
        ]);
    }

    public function userOptions(Team $team): JsonResponse
    {
        return $this->sendResponse([
            'data' => $this->revenueStatsService->userOptions($team),
        ]);
    }
}

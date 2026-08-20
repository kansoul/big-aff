<?php

namespace App\Http\Controllers\Api;

use App\Actions\CampaignReport\ToggleCampaignReportStatusAction;
use App\Http\Requests\CampaignReport\ListCampaignReportsRequest;
use App\Http\Requests\CampaignReport\ToggleCampaignReportStatusRequest;
use App\Http\Resources\CampaignReportResource;
use App\Services\CampaignReport\CampaignReportFilterService;
use App\Services\CampaignReport\CampaignReportService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

/**
 * @tags Campaign Reports
 */
class CampaignReportController extends BaseController
{
    public function __construct(
        private readonly CampaignReportService $campaignReportService,
        private readonly CampaignReportFilterService $campaignReportFilterService,
        private readonly ToggleCampaignReportStatusAction $toggleCampaignReportStatusAction,
    ) {}

    /**
     * List campaign reports
     *
     * Return a paginated list of daily campaign reports (aggregated from insight, revenue,
     * and realtime data in `campaign_reports`). Revenue rows are returned as a flat list
     * grouped by campaign, adset, ad, and session identifiers.
     *
     * @queryParam date_from string Filter records on or after this date (Y-m-d). Example: 2026-04-01
     * @queryParam date_to string Filter records on or before this date (Y-m-d). Example: 2026-04-30
     * @queryParam keyword string Search campaign, account, or link fields. Example: summer
     * @queryParam user_ids integer[] Filter by users assigned to the account.
     * @queryParam account_ids integer[] Filter by `accounts.id`.
     * @queryParam ads_type string Filter by ads type. Enum: google, tiktok. Example: google
     * @queryParam campaign_ids string[] Filter by campaign IDs.
     * @queryParam order_by string Column to sort by. Example: date_start
     * @queryParam order string Sort direction. Enum: asc, desc. Example: desc
     * @queryParam per_page integer Items per page (max 100). Example: 15
     * @queryParam page integer Page number. Example: 1
     */
    public function index(ListCampaignReportsRequest $request): JsonResponse
    {
        $result = $this->campaignReportService->list($request->validated());

        /** @var LengthAwarePaginator $paginator */
        $paginator = $result['paginator'];

        return $this->sendResponse([
            'data' => CampaignReportResource::collection($paginator->items())->resolve($request),
            'pagination' => $this->parsePagination($paginator),
            'grand_summary' => $result['grand_summary'],
        ]);
    }

    /**
     * Get filter options
     *
     * Return option lists used by the Campaign Report filter panel:
     * users, accounts, campaigns, and ads_types.
     *
     * All lists respect the auth user's ownership scope (admin bypasses).
     */
    public function filters(): JsonResponse
    {
        $options = $this->campaignReportFilterService->options();

        return $this->sendResponse(['data' => $options]);
    }

    /**
     * Toggle campaign status (ACTIVE/PAUSED) on the ads platform and mirror the state locally.
     *
     * @urlParam campaign_id string required Campaign ID. Example: 1234567890
     *
     * @bodyParam status string required New status (ACTIVE or PAUSED). Example: PAUSED
     */
    public function toggleStatus(ToggleCampaignReportStatusRequest $request, string $campaign_id): JsonResponse
    {
        $payload = $request->validated();

        $result = $this->toggleCampaignReportStatusAction->execute(
            campaignId: $campaign_id,
            newStatus: (string) $payload['status'],
        );

        if (! $result['success']) {
            return $this->sendError(
                (string) $result['message'],
                [],
                (int) ($result['status'] ?? 500),
            );
        }

        return $this->sendResponse([
            'data' => [
                'campaign_id' => $campaign_id,
                'status' => $result['status_value'],
            ],
        ]);
    }
}

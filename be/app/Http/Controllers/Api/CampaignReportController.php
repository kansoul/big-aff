<?php

namespace App\Http\Controllers\Api;

use App\Actions\CampaignReport\ToggleCampaignReportStatusAction;
use App\Actions\CampaignReport\UpdateCampaignReportTargetCpaAction;
use App\Http\Requests\CampaignReport\ListCampaignReportsRequest;
use App\Http\Requests\CampaignReport\ToggleCampaignReportStatusRequest;
use App\Http\Requests\CampaignReport\UpdateCampaignReportTargetCpaRequest;
use App\Http\Resources\CampaignReportResource;
use App\Services\CampaignReport\CampaignReportFilterService;
use App\Services\CampaignReport\CampaignReportService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @tags Campaign Reports
 */
class CampaignReportController extends BaseController
{
    public function __construct(
        private readonly CampaignReportService $campaignReportService,
        private readonly CampaignReportFilterService $campaignReportFilterService,
        private readonly ToggleCampaignReportStatusAction $toggleCampaignReportStatusAction,
        private readonly UpdateCampaignReportTargetCpaAction $updateCampaignReportTargetCpaAction,
    ) {}

    /**
     * List campaign reports
     *
     * Return a paginated list of daily campaign reports (aggregated from insight, revenue,
     * and realtime data in `campaign_reports`). Supports multiple filters and an optional
     * `group_by` parameter that computes per-group summary on the current page.
     *
     * @queryParam date_from string Filter records on or after this date (Y-m-d). Example: 2026-04-01
     * @queryParam date_to string Filter records on or before this date (Y-m-d). Example: 2026-04-30
     * @queryParam keyword string Search campaign, account, channel, style, or link fields. Example: summer
     * @queryParam user_ids integer[] Filter by users assigned to the account.
     * @queryParam account_ids integer[] Filter by `accounts.id`.
     * @queryParam ads_type string Filter by ads type. Enum: facebook, google. Example: facebook
     * @queryParam campaign_ids string[] Filter by campaign IDs.
     * @queryParam style_codes string[] Filter by style codes.
     * @queryParam channel_codes string[] Filter by channel codes.
     * @queryParam link_data_ids integer[] Filter by `realtime_reports.link_data_id`.
     * @queryParam group_by string Group the current page results by this key. Enum: channel_code, style_code, account_id, user_id, campaign_id.
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

        $data = $result['group_by'] !== null
            ? $this->formatGroupedData($result['groups'], $request)
            : CampaignReportResource::collection($paginator->items())->resolve($request);

        return $this->sendResponse([
            'data' => $data,
            'pagination' => $this->parsePagination($paginator),
            'grand_summary' => $result['grand_summary'],
            'group_by' => $result['group_by'],
        ]);
    }

    /**
     * Collapse each bucket into a single representative row that carries the group
     * label + summary and exposes its underlying campaign reports as `items`.
     * This mirrors the shape consumed by the tracking-afs campaign report UI.
     *
     * @param  array<int, array<string, mixed>>  $groups
     * @return array<int, array<string, mixed>>
     */
    private function formatGroupedData(array $groups, Request $request): array
    {
        return array_map(
            fn (array $group): array => [
                'is_group' => true,
                'group_key' => $group['group_key'],
                'group_label' => $group['group_label'],
                'record_count' => $group['record_count'],
                'group_summary' => $group['group_summary'],
                'items' => CampaignReportResource::collection($group['items'])->resolve($request),
            ],
            $groups,
        );
    }

    /**
     * Get filter options
     *
     * Return option lists used by the Campaign Report filter panel:
     * users, accounts, campaigns, styles, channels, ads_types, link_data_ids.
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

    /**
     * Update a Google campaign's target CPA (chi phí mục tiêu cho mỗi hành động) on the ads
     * platform and mirror the value locally. Only supported for Google campaigns.
     *
     * @urlParam campaign_id string required Campaign ID. Example: 1234567890
     *
     * @bodyParam target_cpa number required New target CPA in account currency. Example: 25.5
     */
    public function updateTargetCpa(UpdateCampaignReportTargetCpaRequest $request, string $campaign_id): JsonResponse
    {
        $payload = $request->validated();

        $result = $this->updateCampaignReportTargetCpaAction->execute(
            campaignId: $campaign_id,
            targetCpa: (float) $payload['target_cpa'],
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
                'target_cpa' => $result['target_cpa'],
            ],
        ]);
    }
}

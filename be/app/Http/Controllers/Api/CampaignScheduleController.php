<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\CampaignSchedule\ListCampaignSchedulesRequest;
use App\Http\Requests\CampaignSchedule\StoreCampaignScheduleRequest;
use App\Http\Requests\CampaignSchedule\UpdateCampaignScheduleRequest;
use App\Http\Resources\CampaignSchedule\CampaignScheduleResource;
use App\Models\CampaignSchedule;
use App\Services\CampaignSchedule\CampaignScheduleService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

/**
 * @tags Campaign Schedules
 */
class CampaignScheduleController extends BaseController
{
    public function __construct(
        private readonly CampaignScheduleService $service,
    ) {}

    /**
     * List campaign schedules
     *
     * @queryParam page integer Page number. Example: 1
     * @queryParam per_page integer Items per page (max 100). Example: 15
     * @queryParam order_by string Column to order by. Example: created_at
     * @queryParam order_direction string asc or desc. Example: desc
     * @queryParam name string Filter by schedule name. Example: Daily
     * @queryParam campaign_id string Filter by campaign ID. Example: 123456789
     * @queryParam is_active boolean Filter by active status. Example: true
     * @queryParam created_by integer Filter by creator user ID. Example: 1
     */
    public function index(ListCampaignSchedulesRequest $request): JsonResponse
    {
        $paginator = $this->service->list($request->validated());

        return $this->sendResponse([
            'data' => CampaignScheduleResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Create a campaign schedule
     */
    public function store(StoreCampaignScheduleRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['created_by'] = Auth::id();

        $schedule = $this->service->create($data);

        return $this->sendResponse(['data' => new CampaignScheduleResource($schedule)], Response::HTTP_CREATED);
    }

    /**
     * Get a campaign schedule
     */
    public function show(CampaignSchedule $campaignSchedule): JsonResponse
    {
        $campaignSchedule->load(['creator', 'items']);

        return $this->sendResponse(['data' => new CampaignScheduleResource($campaignSchedule)]);
    }

    /**
     * Update a campaign schedule
     */
    public function update(UpdateCampaignScheduleRequest $request, CampaignSchedule $campaignSchedule): JsonResponse
    {
        try {
            $schedule = $this->service->update($campaignSchedule, $request->validated());
        } catch (AuthorizationException) {
            return $this->sendError('Unauthorized', [], Response::HTTP_FORBIDDEN);
        }

        return $this->sendResponse(['data' => new CampaignScheduleResource($schedule)]);
    }

    /**
     * Delete a campaign schedule
     */
    public function destroy(CampaignSchedule $campaignSchedule): JsonResponse
    {
        try {
            $this->service->delete($campaignSchedule);
        } catch (AuthorizationException) {
            return $this->sendError('Unauthorized', [], Response::HTTP_FORBIDDEN);
        }

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }
}

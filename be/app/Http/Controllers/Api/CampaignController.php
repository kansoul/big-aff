<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Campaign\ListAdsetsRequest;
use App\Http\Requests\Campaign\ListAdsRequest;
use App\Http\Requests\Campaign\ListCampaignsRequest;
use App\Http\Resources\Campaign\AdsetSelectorResource;
use App\Http\Resources\Campaign\AdsSelectorResource;
use App\Http\Resources\Campaign\CampaignResource;
use App\Services\Campaign\CampaignService;
use Illuminate\Http\JsonResponse;

/**
 * @tags Campaigns
 */
class CampaignController extends BaseController
{
    public function __construct(
        private readonly CampaignService $service,
    ) {}

    /**
     * List campaigns
     *
     * @queryParam page integer Page number. Example: 1
     * @queryParam per_page integer Items per page (max 100). Example: 15
     * @queryParam order_by string Column to order by. Example: created_at
     * @queryParam order_direction string asc or desc. Example: desc
     * @queryParam account_id string Filter by account ID. Example: act_123456
     * @queryParam status string Filter by campaign status (ACTIVE|PAUSED|DELETED|ARCHIVED). Example: ACTIVE
     * @queryParam search string Search by campaign name or campaign ID. Example: Summer Sale
     */
    public function listCampaignSelectorAction(ListCampaignsRequest $request): JsonResponse
    {
        $paginator = $this->service->listCampaignSelectorAction($request->validated());

        return $this->sendResponse([
            'data' => CampaignResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * List adsets for campaign ID selector.
     */
    public function listAdsetSelectorAction(ListAdsetsRequest $request): JsonResponse
    {
        $paginator = $this->service->listAdsetSelectorAction($request->validated());

        return $this->sendResponse([
            'data' => AdsetSelectorResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * List ads for campaign ID selector.
     */
    public function listAdsSelectorAction(ListAdsRequest $request): JsonResponse
    {
        $paginator = $this->service->listAdsSelectorAction($request->validated());

        return $this->sendResponse([
            'data' => AdsSelectorResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }
}

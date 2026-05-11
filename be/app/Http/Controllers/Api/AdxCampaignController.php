<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Adx\LinkData\ListAdxCampaignsRequest;
use App\Http\Resources\Adx\AdxCampaignResource;
use App\Services\Adx\AdxCampaignService;
use Illuminate\Http\JsonResponse;

/**
 * @tags AdX Campaign Mapping
 */
class AdxCampaignController extends BaseController
{
    public function __construct(
        private readonly AdxCampaignService $service,
    ) {}

    public function campaigns(ListAdxCampaignsRequest $request): JsonResponse
    {
        $paginator = $this->service->listCampaigns($request->validated());

        return $this->sendResponse([
            'data' => AdxCampaignResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }
}

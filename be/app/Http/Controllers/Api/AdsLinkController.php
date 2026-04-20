<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\AdsLink\ListAdsLinksRequest;
use App\Http\Requests\AdsLink\StoreAdsLinkRequest;
use App\Http\Requests\AdsLink\UpdateAdsLinkRequest;
use App\Http\Resources\AdsLinkResource;
use App\Models\AdsLink;
use App\Services\AdsLink\AdsLinkService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags Ads Links
 */
class AdsLinkController extends BaseController
{
    public function __construct(
        private readonly AdsLinkService $adsLinkService
    ) {}

    /**
     * List ads links
     */
    public function index(ListAdsLinksRequest $request): JsonResponse
    {
        $paginator = $this->adsLinkService->list($request->validated());

        return $this->sendResponse([
            'data' => AdsLinkResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Create ads link
     */
    public function store(StoreAdsLinkRequest $request): JsonResponse
    {
        $adsLink = $this->adsLinkService->create($request->validated());
        $adsLink->load(['site', 'post', 'keywordSet']);

        return $this->sendResponse(
            ['data' => new AdsLinkResource($adsLink)],
            Response::HTTP_CREATED
        );
    }

    /**
     * Update ads link (only rac, fbid, googleid)
     */
    public function update(UpdateAdsLinkRequest $request, AdsLink $adsLink): JsonResponse
    {
        $updated = $this->adsLinkService->update($adsLink, $request->validated());
        $updated->load(['site', 'post', 'keywordSet']);

        return $this->sendResponse(['data' => new AdsLinkResource($updated)]);
    }

    /**
     * Toggle hide/show ads link
     */
    public function toggleHide(AdsLink $adsLink): JsonResponse
    {
        $this->authorize('toggleHide', $adsLink);

        $updated = $this->adsLinkService->toggleHide($adsLink);

        return $this->sendResponse(['data' => new AdsLinkResource($updated)]);
    }
}

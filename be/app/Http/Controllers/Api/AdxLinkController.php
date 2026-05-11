<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Adx\Link\ListAdxLinksRequest;
use App\Http\Requests\Adx\Link\StoreAdxLinkRequest;
use App\Http\Requests\Adx\Link\UpdateAdxLinkRequest;
use App\Http\Resources\Adx\AdxLinkResource;
use App\Models\AdxLink;
use App\Services\Adx\AdxLinkService;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags AdX Links
 */
class AdxLinkController extends BaseController
{
    public function __construct(
        private readonly AdxLinkService $service,
    ) {}

    public function index(ListAdxLinksRequest $request): JsonResponse
    {
        $paginator = $this->service->list($request->validated());

        return $this->sendResponse([
            'data' => AdxLinkResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    public function store(StoreAdxLinkRequest $request): JsonResponse
    {
        $link = $this->service->create($request->validated())->load('game');

        return $this->sendResponse(['data' => new AdxLinkResource($link)], Response::HTTP_CREATED);
    }

    public function show(AdxLink $adxLink): JsonResponse
    {
        OwnershipFilter::forAuthUser()->authorize($adxLink->created_by);

        return $this->sendResponse(['data' => new AdxLinkResource($adxLink->load('game'))]);
    }

    public function update(UpdateAdxLinkRequest $request, AdxLink $adxLink): JsonResponse
    {
        $link = $this->service->update($adxLink, $request->validated())->load('game');

        return $this->sendResponse(['data' => new AdxLinkResource($link)]);
    }

    public function destroy(AdxLink $adxLink): JsonResponse
    {
        $this->service->delete($adxLink);

        return $this->sendResponse(['data' => ['message' => 'AdX link deleted successfully']]);
    }
}

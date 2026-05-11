<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Adx\AccountConversion\ListAdxAccountConversionsRequest;
use App\Http\Requests\Adx\AccountConversion\StoreAdxAccountConversionRequest;
use App\Http\Requests\Adx\AccountConversion\UpdateAdxAccountConversionRequest;
use App\Http\Resources\Adx\AdxAccountConversionResource;
use App\Models\AdxAccountConversion;
use App\Services\Adx\AdxAccountConversionService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags AdX Account Conversions
 */
class AdxAccountConversionController extends BaseController
{
    public function __construct(
        private readonly AdxAccountConversionService $service,
    ) {}

    public function index(ListAdxAccountConversionsRequest $request): JsonResponse
    {
        $paginator = $this->service->list($request->validated());

        return $this->sendResponse([
            'data' => AdxAccountConversionResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    public function store(StoreAdxAccountConversionRequest $request): JsonResponse
    {
        $conversion = $this->service->upsert($request->validated());

        return $this->sendResponse(['data' => new AdxAccountConversionResource($conversion)], Response::HTTP_CREATED);
    }

    public function update(UpdateAdxAccountConversionRequest $request, AdxAccountConversion $adxAccountConversion): JsonResponse
    {
        $conversion = $this->service->update($adxAccountConversion, $request->validated());

        return $this->sendResponse(['data' => new AdxAccountConversionResource($conversion)]);
    }

    public function destroy(AdxAccountConversion $adxAccountConversion): JsonResponse
    {
        $this->service->delete($adxAccountConversion);

        return $this->sendResponse(['data' => ['message' => 'AdX account conversion deleted successfully']]);
    }
}

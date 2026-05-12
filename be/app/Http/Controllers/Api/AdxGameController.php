<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Adx\Game\ListAdxGamesRequest;
use App\Http\Requests\Adx\Game\StoreAdxGameRequest;
use App\Http\Requests\Adx\Game\UpdateAdxGameRequest;
use App\Http\Resources\Adx\AdxGameResource;
use App\Models\AdxGame;
use App\Services\Adx\AdxGameService;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags AdX Games
 */
class AdxGameController extends BaseController
{
    public function __construct(
        private readonly AdxGameService $service,
    ) {}

    public function index(ListAdxGamesRequest $request): JsonResponse
    {
        $paginator = $this->service->list($request->validated());

        return $this->sendResponse([
            'data' => AdxGameResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    public function store(StoreAdxGameRequest $request): JsonResponse
    {
        $game = $this->service->create($request->validated());

        return $this->sendResponse(['data' => new AdxGameResource($game)], Response::HTTP_CREATED);
    }

    public function show(AdxGame $adxGame): JsonResponse
    {
        OwnershipFilter::forAuthUser()->authorize($adxGame->created_by);

        return $this->sendResponse(['data' => new AdxGameResource($adxGame)]);
    }

    public function update(UpdateAdxGameRequest $request, AdxGame $adxGame): JsonResponse
    {
        $game = $this->service->update($adxGame, $request->validated());

        return $this->sendResponse(['data' => new AdxGameResource($game)]);
    }

    public function destroy(AdxGame $adxGame): JsonResponse
    {
        $this->service->delete($adxGame);

        return $this->sendResponse(['data' => ['message' => 'AdX game deleted successfully']]);
    }
}

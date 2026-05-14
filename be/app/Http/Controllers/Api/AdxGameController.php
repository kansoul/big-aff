<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Adx\Game\AssignAdxGameRequest;
use App\Http\Requests\Adx\Game\ListAdxGamesRequest;
use App\Http\Requests\Adx\Game\ListUsersWithAdxGamesRequest;
use App\Http\Requests\Adx\Game\StoreAdxGameRequest;
use App\Http\Requests\Adx\Game\UpdateAdxGameRequest;
use App\Http\Resources\Adx\AdxGameResource;
use App\Models\AdxGame;
use App\Models\User;
use App\Services\Adx\AdxGameService;
use App\Support\OwnerResource\AdxGameOwnerResource;
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
        (new AdxGameOwnerResource)->authorize($adxGame);

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

    public function listUsersWithGames(ListUsersWithAdxGamesRequest $request): JsonResponse
    {
        $paginator = $this->service->listUsersWithGames($request->validated());

        $data = collect($paginator->items())->map(fn (User $user) => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'games' => $user->adxGames->map(fn (AdxGame $game) => [
                'id' => $game->id,
                'name' => $game->name,
                'slug' => $game->slug,
                'game_url' => $game->game_url,
                'status' => $game->status,
            ])->values(),
        ]);

        return $this->sendResponse([
            'data' => $data,
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    public function assignToUser(AssignAdxGameRequest $request, User $user): JsonResponse
    {
        $result = $this->service->assignToUser($user, $request->validated('game_ids', []));

        return $this->sendResponse(['skipped_game_ids' => $result['skipped_game_ids']]);
    }
}

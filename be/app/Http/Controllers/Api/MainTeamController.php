<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\MainTeam\ListMainTeamsRequest;
use App\Http\Requests\MainTeam\StoreMainTeamRequest;
use App\Http\Requests\MainTeam\UpdateMainTeamRequest;
use App\Http\Resources\MainTeam\MainTeamResource;
use App\Models\MainTeam;
use App\Services\MainTeam\MainTeamService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags Main Teams
 */
class MainTeamController extends BaseController
{
    public function __construct(
        private readonly MainTeamService $mainTeamService,
    ) {}

    public function index(ListMainTeamsRequest $request): JsonResponse
    {
        $paginator = $this->mainTeamService->list($request->validated());

        return $this->sendResponse([
            'data' => MainTeamResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    public function store(StoreMainTeamRequest $request): JsonResponse
    {
        $mainTeam = $this->mainTeamService->create($request->validated());

        return $this->sendResponse(
            ['data' => new MainTeamResource($mainTeam)],
            Response::HTTP_CREATED,
        );
    }

    public function show(MainTeam $mainTeam): JsonResponse
    {
        $mainTeam->load(['accounts', 'channels'])->loadCount(['accounts', 'channels']);

        return $this->sendResponse(['data' => new MainTeamResource($mainTeam)]);
    }

    public function update(UpdateMainTeamRequest $request, MainTeam $mainTeam): JsonResponse
    {
        $updated = $this->mainTeamService->update($mainTeam, $request->validated());

        return $this->sendResponse(['data' => new MainTeamResource($updated)]);
    }

    public function destroy(MainTeam $mainTeam): JsonResponse
    {
        $this->mainTeamService->delete($mainTeam);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\API\BaseController;
use App\Http\Requests\User\SyncUserParentChildrenRequest;
use App\Models\User;
use App\Services\User\UserParentChildService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class UserParentChildController extends BaseController
{
    use AuthorizesRequests;

    public function __construct(
        private readonly UserParentChildService $userParentChildService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $auth = $request->user();
        if (! $auth instanceof User) {
            return $this->sendError('Unauthenticated.', [], Response::HTTP_UNAUTHORIZED);
        }

        $this->authorize('viewAny', User::class);

        $payload = $this->userParentChildService->listAssignmentsForActor($auth);

        return $this->sendResponse(
            [
                'data' => $payload,
            ]
        );
    }

    public function update(SyncUserParentChildrenRequest $request, User $user): JsonResponse
    {
        $auth = $request->user();
        if (! $auth instanceof User) {
            return $this->sendError('Unauthenticated.', [], Response::HTTP_UNAUTHORIZED);
        }

        /** @var array{child_ids: list<int>} $data */
        $data = $request->validated();

        $this->userParentChildService->syncChildren($auth, $user, $data['child_ids']);

        $payload = $this->userParentChildService->listAssignmentsForActor($auth);

        return $this->sendResponse(
            [
                'data' => $payload,
            ]
        );
    }
}

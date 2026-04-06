<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\API\BaseController;
use App\Http\Requests\User\ListParentChildAssignmentsRequest;
use App\Http\Requests\User\SyncUserParentChildrenRequest;
use App\Models\User;
use App\Services\User\UserParentChildService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags Users
 */
class UserParentChildController extends BaseController
{
    use AuthorizesRequests;

    public function __construct(
        private readonly UserParentChildService $userParentChildService,
    ) {}

    /**
     * List parent-child assignments
     *
     * Return the parent-child user hierarchy visible to the authenticated actor.
     */
    public function index(ListParentChildAssignmentsRequest $request): JsonResponse
    {
        $auth = $request->user();
        if (! $auth instanceof User) {
            return $this->sendError('Unauthenticated.', [], Response::HTTP_UNAUTHORIZED);
        }

        $this->authorize('viewAny', User::class);

        $payload = $this->userParentChildService->listAssignments($auth, $request->validated());

        return $this->sendResponse(
            [
                'data' => [
                    'assignments' => $payload['assignments']->items(),
                    'user_options' => $payload['user_options']->items(),
                ],
                'pagination' => $this->parsePagination($payload['assignments']),
                'options_pagination' => $this->parseSimplePagination($payload['user_options']),
            ]
        );
    }

    /**
     * Sync parent's children
     *
     * Replace the list of child users assigned to the given parent user.
     * When `child_ids` is null, all child links are removed (user is no longer a parent).
     */
    public function update(SyncUserParentChildrenRequest $request, User $user): JsonResponse
    {
        $auth = $request->user();
        if (! $auth instanceof User) {
            return $this->sendError('Unauthenticated.', [], Response::HTTP_UNAUTHORIZED);
        }

        /** @var array<string, mixed> $data */
        $data = $request->validated();

        $this->userParentChildService->syncChildren($auth, $user, $data['child_ids'] ?? null);

        $payload = $this->userParentChildService->listAssignments($auth, $request->validated());

        return $this->sendResponse(
            [
                'data' => [
                    'assignments' => $payload['assignments']->items(),
                    'user_options' => $payload['user_options']->items(),
                ],
                'pagination' => $this->parsePagination($payload['assignments']),
                'options_pagination' => $this->parseSimplePagination($payload['user_options']),
            ]
        );
    }
}

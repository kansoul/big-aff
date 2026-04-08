<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\API\BaseController;
use App\Http\Requests\User\ListParentChildAssignmentsRequest;
use App\Http\Requests\User\SyncUserParentChildrenRequest;
use App\Models\User;
use App\Services\User\UserParentChildService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;

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
        return $this->sendResponse(
            $this->userParentChildService->listAssignmentsPayload($request->validated()),
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
        return $this->sendResponse(
            $this->userParentChildService->syncChildrenAndListAssignmentsPayload($user, $request->validated()),
        );
    }
}

<?php

namespace App\Http\Controllers\Api;


use App\Http\Requests\User\ListParentChildAssignmentsRequest;
use App\Http\Requests\User\SyncUserParentChildrenRequest;
use App\Models\Team;
use App\Models\User;
use App\Services\User\UserParentChildService;
use Illuminate\Http\JsonResponse;

/**
 * @tags Users
 */
class UserParentChildController extends BaseController
{
    public function __construct(
        private readonly UserParentChildService $userParentChildService,
    ) {}

    /**
     * List parent-child assignments
     *
     * Return the parent-child user hierarchy visible to the authenticated actor.
     *
     * @queryParam order_by string Column to sort by. Enum: id, name, email, created_at. Example: name
     * @queryParam order string Sort direction. Enum: asc, desc. Example: asc
     * @queryParam per_page integer Items per page (max 100). Example: 15
     * @queryParam page integer Page number. Example: 1
     * @queryParam options_per_page integer Items per page for user options (max 100). Example: 15
     * @queryParam options_page integer Page number for user options. Example: 1
     */
    public function index(ListParentChildAssignmentsRequest $request): JsonResponse
    {
        $result = $this->userParentChildService->listAssignments($request->validated());

        return $this->sendResponse([
            'data' => [
                'assignments' => $result['assignments']->items(),
                'user_options' => $result['user_options']->items(),
            ],
        ]);
    }

    /**
     * Team member options for child assignment
     *
     * Return leaders and members in the given team.
     * Use this to populate the child selector when assigning children to a leader.
     *
     * @urlParam team integer required The team ID. Example: 1
     *
     * @response 200 {"data": [{"id": 2, "name": "Jane Doe", "email": "jane@example.com", "is_assigned_child": false}]}
     */
    public function teamMemberOptions(Team $team): JsonResponse
    {
        return $this->sendResponse([
            'data' => $this->userParentChildService->teamMemberOptions($team),
        ]);
    }

    /**
     * Sync parent's children
     *
     * Replace the list of child users assigned to the given parent user.
     * When `child_ids` is null or empty, all child links are removed.
     *
     * @urlParam user integer required The parent user ID. Example: 1
     *
     * @bodyParam child_ids integer[]|null List of child user IDs. Example: [2, 3]
     *
     * @response 200 {"message": "Children synced successfully."}
     * @response 403 {"message": "This action is unauthorized."}
     * @response 404 {"message": "No query results for model [App\\Models\\User] 1"}
     * @response 422 {"message": "The child_ids.0 must be an integer.", "errors": {"child_ids.0": ["The child_ids.0 must be an integer."]}}
     */
    public function update(SyncUserParentChildrenRequest $request, User $user): JsonResponse
    {
        $this->userParentChildService->syncChildren($user, $request->validated('child_ids'));

        return $this->sendResponse(['message' => 'Children synced successfully.']);
    }
}

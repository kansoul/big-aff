<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Account\AssignAccountRequest;
use App\Http\Requests\User\ListUsersRequest;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\ManagedUserResource;
use App\Http\Resources\User\UserOptionResource;
use App\Models\User;
use App\Services\Team\TeamService;
use App\Services\User\UserService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags Users
 */
class UserController extends BaseController
{
    use AuthorizesRequests;

    public function __construct(
        private readonly UserService $userService,
        private readonly TeamService $teamService,
    ) {}

    /**
     * List users
     *
     * Return all users the authenticated actor is allowed to manage.
     *
     * @response 200 {"data": [{"id": 1, "name": "User", "email": "user@example.com", "role_id": 1, "role": {"id": 1, "name": "Admin", "permissions": []}, "parent_id": null, "parent": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}], "pagination": {"total": 1, "per_page": 15, "current_page": 1, "last_page": 1}}
     */
    public function index(ListUsersRequest $request): JsonResponse
    {
        $auth = $request->user();
        if (! $auth instanceof User) {
            return $this->sendError('Unauthenticated.', [], Response::HTTP_UNAUTHORIZED);
        }

        $this->authorize('viewAny', User::class);

        $paginator = $this->userService->list($auth, $request->validated());

        return $this->sendResponse(
            [
                'data' => ManagedUserResource::collection($paginator->items()),
                'pagination' => $this->parsePagination($paginator),
            ]
        );
    }

    /**
     * Create user
     *
     * Create a new user with the given payload.
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = $this->userService->create($request->validated());

        return $this->sendResponse(
            [
                'data' => new ManagedUserResource($user),
            ]
        );
    }

    /**
     * Update user
     *
     * Update an existing user's attributes (partial update supported).
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $updated = $this->userService->update($user, $request->validated());

        return $this->sendResponse(
            [
                'data' => new ManagedUserResource($updated),
            ]
        );
    }

    /**
     * User options for select inputs
     */
    public function options(): JsonResponse
    {
        $users = User::query()
            ->select(['id', 'name'])
            ->orderBy('name')
            ->get();

        return $this->sendResponse([
            'data' => UserOptionResource::collection($users),
        ]);
    }

    /**
     * User team options
     *
     * Return the teams a user belongs to, for use in select/dropdown inputs.
     *
     * @urlParam user integer required The user ID. Example: 1
     *
     * @response 200 {"data": [{"id": 1, "name": "Marketing", "team_role": "manager"}]}
     * @response 404 {"message": "No query results for model [App\\Models\\User] 1"}
     */
    public function teamOptions(User $user): JsonResponse
    {
        return $this->sendResponse([
            'data' => $this->teamService->userTeamOptions($user),
        ]);
    }

    /**
     * Delete user
     *
     * Remove a user from the system.
     */
    public function destroy(User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        $this->userService->delete($user);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }

    /**
     * Assign accounts to user
     *
     * Assign one or more accounts to a user. Existing assignments are preserved (additive).
     *
     * @urlParam user integer required The user ID. Example: 1
     *
     * @bodyParam account_ids integer[] required List of account IDs to assign. Example: [1, 2, 3]
     *
     * @response 200 {"data": []}
     * @response 403 {"message": "This action is unauthorized."}
     * @response 404 {"message": "No query results for model [App\\Models\\User] 1"}
     * @response 422 {"message": "The account_ids field is required.", "errors": {"account_ids": ["The account_ids field is required."]}}
     */
    public function assignAccounts(AssignAccountRequest $request, User $user): JsonResponse
    {
        $this->userService->assignAccounts($user, $request->validated('account_ids'));

        return $this->sendResponse([]);
    }
}

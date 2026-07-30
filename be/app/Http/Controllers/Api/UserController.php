<?php

namespace App\Http\Controllers\Api;

use App\Actions\Post\ListUsersWithPostsAction;
use App\Http\Requests\Post\AssignUserPostsRequest;
use App\Http\Requests\Post\ListUsersWithPostsRequest;
use App\Http\Requests\User\ListUsersRequest;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\ManagedUserResource;
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
        private readonly ListUsersWithPostsAction $listUsersWithPostsAction,
    ) {}

    /**
     * List users
     *
     * Return all users the authenticated actor is allowed to manage.
     * Each user includes their assigned accounts with business center and team details.
     *
     * @response 200 {"data": [{"id": 1, "name": "User", "email": "user@example.com", "role_id": 1, "role": {"id": 1, "name": "Admin", "permissions": []}, "parent_id": null, "parent": null, "accounts": [{"id": 1, "business_center_id": 1, "business_center": {"id": 1, "name": "My BC"}, "team_id": null, "team": null, "account_id": "123456", "account_name": "My Account", "ads_type": "google", "status": "active", "is_special": false, "sync_to_mcc": false, "created_by": 1, "updated_by": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}], "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}], "pagination": {"total": 1, "per_page": 15, "current_page": 1, "last_page": 1}}
     */
    public function index(ListUsersRequest $request): JsonResponse
    {
        $paginator = $this->userService->list($request->validated());

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
     * List users with their assigned posts
     *
     * Return a paginated list of users the auth actor can manage,
     * each including the IDs of posts currently assigned to them.
     *
     * @response 200 {"data": [{"id": 1, "name": "User", "email": "user@example.com", "assigned_post_ids": [3, 7]}], "pagination": {"total": 1, "per_page": 30, "current_page": 1, "last_page": 1}}
     */
    public function listUsersWithPosts(ListUsersWithPostsRequest $request): JsonResponse
    {
        $paginator = $this->listUsersWithPostsAction->execute($request->validated());

        $data = collect($paginator->items())->map(fn (User $user) => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'assigned_post_ids' => $user->assignedPosts->pluck('id')->values()->all(),
        ]);

        return $this->sendResponse([
            'data' => $data,
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Assign posts to user
     *
     * Sync a list of posts assigned to a user for view-only access.
     * Send an empty array to remove all assigned posts.
     *
     * @urlParam user integer required The user ID. Example: 2
     *
     * @bodyParam post_ids integer[] required Array of post IDs to assign. Example: [1, 2, 3]
     *
     * @response 200 {"message": "Posts assigned successfully."}
     * @response 403 {"message": "This action is unauthorized."}
     * @response 404 {"message": "No query results for model [App\\Models\\User] 2"}
     */
    public function assignPosts(AssignUserPostsRequest $request, User $user): JsonResponse
    {
        $this->userService->assignPosts($user, $request->validated()['post_ids']);

        return $this->sendResponse(['message' => 'Posts assigned successfully.']);
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
}

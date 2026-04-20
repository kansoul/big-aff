<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Team\AssignTeamRequest;
use App\Http\Requests\Team\ListTeamsRequest;
use App\Http\Requests\Team\StoreTeamRequest;
use App\Http\Requests\Team\UpdateTeamRequest;
use App\Http\Resources\Team\TeamLeaderResource;
use App\Http\Resources\Team\TeamResource;
use App\Models\Team;
use App\Models\User;
use App\Services\Team\TeamService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags Teams
 */
class TeamController extends BaseController
{
    public function __construct(
        private readonly TeamService $teamService
    ) {}

    /**
     * List teams
     *
     * Return paginated list of teams.
     *
     * @queryParam query string Search by name. Example: marketing
     * @queryParam order_by string Column to sort by. Enum: id, name, created_at. Example: created_at
     * @queryParam order string Sort direction. Enum: asc, desc. Example: desc
     * @queryParam per_page integer Items per page (max 100). Example: 15
     * @queryParam page integer Page number. Example: 1
     *
     * @response 200 {"data": [{"id": 1, "name": "Marketing", "description": "Marketing team", "created_by": 1, "updated_by": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}], "pagination": {"total": 1, "per_page": 15, "current_page": 1, "last_page": 1}}
     */
    public function index(ListTeamsRequest $request): JsonResponse
    {
        $paginator = $this->teamService->list($request->validated());

        return $this->sendResponse([
            'data' => TeamResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Create team
     *
     * Create a new team.
     *
     * @bodyParam name string required Team name (max 255). Example: Marketing
     * @bodyParam description string optional Team description. Example: Marketing team
     *
     * @response 201 {"data": {"id": 1, "name": "Marketing", "description": "Marketing team", "created_by": 1, "updated_by": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}}
     * @response 422 {"message": "The name field is required.", "errors": {"name": ["The name field is required."]}}
     */
    public function store(StoreTeamRequest $request): JsonResponse
    {
        $team = $this->teamService->create($request->validated());

        return $this->sendResponse(
            ['data' => new TeamResource($team)],
            Response::HTTP_CREATED
        );
    }

    /**
     * Show team
     *
     * Return a single team by ID.
     *
     * @urlParam team integer required The team ID. Example: 1
     *
     * @response 200 {"data": {"id": 1, "name": "Marketing", "description": "Marketing team", "created_by": 1, "updated_by": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}}
     * @response 404 {"message": "No query results for model [App\\Models\\Team] 1"}
     */
    public function show(Team $team): JsonResponse
    {
        $team->loadMissing('users');

        return $this->sendResponse(
            ['data' => new TeamResource($team)]
        );
    }

    /**
     * Update team
     *
     * Update an existing team (partial update supported).
     *
     * @urlParam team integer required The team ID. Example: 1
     *
     * @bodyParam name string optional Team name (max 255). Example: Updated Marketing
     * @bodyParam description string optional Team description. Example: Updated description
     *
     * @response 200 {"data": {"id": 1, "name": "Updated Marketing", "description": "Updated description", "created_by": 1, "updated_by": 2, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-06-01T00:00:00+00:00"}}
     * @response 403 {"message": "This action is unauthorized."}
     * @response 404 {"message": "No query results for model [App\\Models\\Team] 1"}
     */
    public function update(UpdateTeamRequest $request, Team $team): JsonResponse
    {
        $updated = $this->teamService->update($team, $request->validated());

        return $this->sendResponse(
            ['data' => new TeamResource($updated)]
        );
    }

    /**
     * Delete team
     *
     * Delete a team.
     *
     * @urlParam team integer required The team ID. Example: 1
     *
     * @response 204 {}
     * @response 403 {"message": "This action is unauthorized."}
     * @response 404 {"message": "No query results for model [App\\Models\\Team] 1"}
     */
    public function destroy(Team $team): JsonResponse
    {
        $this->teamService->delete($team);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }

    /**
     * Assign users to team
     *
     * Assign one or more users to a team. Users already in the team are skipped.
     *
     * @urlParam team integer required The team ID. Example: 1
     *
     * @bodyParam user_ids integer[] required Array of user IDs to assign. Example: [1, 2, 3]
     * @bodyParam team_role string optional Role within the team. Enum: manager, leader, member. Default: member. Example: member
     *
     * @response 200 {"message": "Users assigned successfully."}
     * @response 403 {"message": "This action is unauthorized."}
     * @response 404 {"message": "No query results for model [App\\Models\\Team] 1"}
     * @response 422 {"message": "The user_ids field is required.", "errors": {"user_ids": ["The user_ids field is required."]}}
     */
    /**
     * User options for assign
     *
     * Return users that can be assigned to the team (excludes users already in the team).
     *
     * @urlParam team integer required The team ID. Example: 1
     *
     * @response 200 {"data": [{"id": 1, "name": "John Doe", "email": "john@example.com"}]}
     * @response 403 {"message": "This action is unauthorized."}
     * @response 404 {"message": "No query results for model [App\\Models\\Team] 1"}
     */
    public function userOptions(Team $team): JsonResponse
    {
        return $this->sendResponse([
            'data' => $this->teamService->userOptions($team),
        ]);
    }

    /**
     * Team options
     *
     * Return a flat list of teams for use in select/dropdown inputs.
     *
     * @response 200 {"data": [{"id": 1, "name": "Marketing"}]}
     */
    public function options(): JsonResponse
    {
        return $this->sendResponse(['data' => $this->teamService->options()]);
    }

    /**
     * List team leaders
     *
     * Return all users with the leader role in a team, including their assigned child users.
     *
     * @urlParam team integer required The team ID. Example: 1
     *
     * @response 200 {"data": [{"id": 1, "name": "John Doe", "email": "john@example.com", "assigned_users": [{"id": 3, "name": "Alice", "email": "alice@example.com"}]}]}
     * @response 403 {"message": "This action is unauthorized."}
     * @response 404 {"message": "No query results for model [App\\Models\\Team] 1"}
     */
    public function leaders(Team $team): JsonResponse
    {
        $leaders = $this->teamService->leaders($team);

        return $this->sendResponse([
            'data' => TeamLeaderResource::collection($leaders),
        ]);
    }

    public function assignUsers(AssignTeamRequest $request, Team $team): JsonResponse
    {
        $result = $this->teamService->assign($team, $request->validated());

        $response = ['message' => 'Users assigned successfully.'];

        if (! empty($result['conflicts'])) {
            $response['conflicts'] = $result['conflicts'];
        }

        return $this->sendResponse($response);
    }
}

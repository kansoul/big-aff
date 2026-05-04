<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Account\AssignAccountRequest;
use App\Http\Requests\Account\ListUsersWithAccountsRequest;
use App\Http\Requests\Channel\AssignChannelRequest;
use App\Http\Requests\Channel\ListUsersWithChannelsRequest;
use App\Http\Requests\Post\AssignUserPostsRequest;
use App\Http\Requests\Post\ListUsersWithPostsRequest;
use App\Http\Requests\Site\AssignSiteRequest;
use App\Http\Requests\Team\AssignTeamRequest;
use App\Http\Resources\ChannelResource;
use App\Models\Site;
use App\Models\Team;
use App\Models\User;
use App\Services\Assign\AssignService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssignController extends BaseController
{
    public function __construct(
        private readonly AssignService $assignService,
    ) {}

    /**
     * List users with channels
     *
     * Return a paginated list of users with their assigned channels.
     *
     * @response 200 {"data": [{"user_id": 1, "name": "John", "email": "john@example.com", "channels": []}], "pagination": {}}
     */
    public function usersWithChannels(ListUsersWithChannelsRequest $request): JsonResponse
    {
        info(123);
        $paginator = $this->assignService->usersWithChannels($request->validated());

        $data = collect($paginator->items())->map(fn (User $user) => [
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'channels' => ChannelResource::collection($user->channels)->resolve(),
        ]);

        return $this->sendResponse([
            'data' => $data,
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Assign channels to user
     *
     * Sync channel assignments for a user. Channels already assigned to another user are skipped.
     *
     * @urlParam user integer required The user ID. Example: 1
     *
     * @bodyParam channel_codes string[] required Array of channel codes to assign. Example: ["chan-a", "chan-b"]
     *
     * @response 200 {"skipped_codes": []}
     */
    public function assignChannelsToUser(AssignChannelRequest $request, User $user): JsonResponse
    {
        info(456);
        $result = $this->assignService->assignChannelsToUser($user, $request->validated('channel_codes', []));

        return $this->sendResponse(['skipped_codes' => $result['skipped_codes']]);
    }

    /**
     * List users with accounts
     *
     * Return a paginated list of users with their assigned accounts.
     *
     * @response 200 {"data": [{"id": 1, "name": "John", "email": "john@example.com", "accounts": []}], "pagination": {}}
     */
    public function usersWithAccounts(ListUsersWithAccountsRequest $request): JsonResponse
    {
        $paginator = $this->assignService->usersWithAccounts($request->validated());

        $data = collect($paginator->items())->map(fn (User $user) => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'accounts' => $user->accounts->map(fn ($a) => [
                'id' => $a->id,
                'account_id' => $a->account_id,
                'account_name' => $a->account_name,
            ])->values(),
        ]);

        return $this->sendResponse([
            'data' => $data,
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Account assign options
     *
     * Return accounts accessible to the authenticated user for assign dropdowns.
     *
     * @queryParam user_id integer optional The user being assigned. Defaults to auth user. Example: 5
     *
     * @response 200 {"data": [{"id": 1, "account_id": "123456", "account_name": "My Account", "team_id": 1}]}
     */
    public function accountAssignOptions(Request $request): JsonResponse
    {
        $userId = $request->integer('user_id') ?: null;

        return $this->sendResponse(['data' => $this->assignService->accountAssignOptions($userId)]);
    }

    /**
     * Assign accounts to user
     *
     * Sync account assignments for a user. Only accounts in the user's teams are valid.
     *
     * @urlParam user integer required The user ID. Example: 1
     *
     * @bodyParam account_ids integer[] required List of account IDs to assign. Example: [1, 2, 3]
     *
     * @response 200 {"data": []}
     */
    public function assignAccountsToUser(AssignAccountRequest $request, User $user): JsonResponse
    {
        $this->assignService->assignAccountsToUser($user, $request->validated('account_ids', []));

        return $this->sendResponse([]);
    }

    /**
     * List users with posts
     *
     * Return a paginated list of users with their assigned post IDs.
     *
     * @response 200 {"data": [{"id": 1, "name": "User", "email": "user@example.com", "assigned_post_ids": [3, 7]}], "pagination": {}}
     */
    public function usersWithPosts(ListUsersWithPostsRequest $request): JsonResponse
    {
        $paginator = $this->assignService->usersWithPosts($request->validated());

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
     *
     * @urlParam user integer required The user ID. Example: 1
     *
     * @bodyParam post_ids integer[] required Array of post IDs to assign. Example: [1, 2, 3]
     *
     * @response 200 {"message": "Posts assigned successfully."}
     */
    public function assignPostsToUser(AssignUserPostsRequest $request, User $user): JsonResponse
    {
        $this->assignService->assignPostsToUser($user, $request->validated()['post_ids']);

        return $this->sendResponse(['message' => 'Posts assigned successfully.']);
    }

    /**
     * Site user options
     *
     * Return users available to assign to a site.
     *
     * @urlParam site integer required The site ID. Example: 1
     *
     * @response 200 {"data": [{"id": 1, "name": "John Doe", "email": "john@example.com"}], "assigned_user_ids": [2]}
     */
    public function siteUserOptions(Site $site): JsonResponse
    {
        $result = $this->assignService->siteUserOptions($site);

        return $this->sendResponse([
            'data' => $result['options'],
            'assigned_user_ids' => $result['assigned_user_ids'],
        ]);
    }

    /**
     * Assign users to site
     *
     * Assign one or more users to a site.
     *
     * @urlParam site integer required The site ID. Example: 1
     *
     * @bodyParam user_ids integer[] required Array of user IDs to assign. Example: [1, 2, 3]
     *
     * @response 200 {"message": "Users assigned successfully."}
     */
    public function assignUsersToSite(AssignSiteRequest $request, Site $site): JsonResponse
    {
        $this->assignService->assignUsersToSite($site, $request->validated()['user_ids']);

        return $this->sendResponse(['message' => 'Users assigned successfully.']);
    }

    /**
     * Team user options
     *
     * Return users available to assign to a team.
     *
     * @urlParam team integer required The team ID. Example: 1
     *
     * @response 200 {"data": [{"id": 1, "name": "John Doe", "email": "john@example.com"}]}
     */
    public function teamUserOptions(Team $team): JsonResponse
    {
        return $this->sendResponse([
            'data' => $this->assignService->teamUserOptions($team),
        ]);
    }

    /**
     * Assign users to team
     *
     * Assign one or more users to a team.
     *
     * @urlParam team integer required The team ID. Example: 1
     *
     * @bodyParam user_ids integer[] required Array of user IDs to assign. Example: [1, 2, 3]
     * @bodyParam team_role string optional Role within the team. Enum: manager, leader, member. Default: member. Example: member
     *
     * @response 200 {"message": "Users assigned successfully."}
     */
    public function assignUsersToTeam(AssignTeamRequest $request, Team $team): JsonResponse
    {
        $result = $this->assignService->assignUsersToTeam($team, $request->validated());

        $response = ['message' => 'Users assigned successfully.'];

        if (! empty($result['conflicts'])) {
            $response['conflicts'] = $result['conflicts'];
        }

        return $this->sendResponse($response);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Services\Option\OptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OptionController extends BaseController
{
    public function __construct(
        private readonly OptionService $optionService,
    ) {}

    /**
     * User options
     *
     * Return active users accessible to the authenticated user for select/dropdown inputs.
     *
     * @response 200 {"data": [{"id": 1, "name": "John Doe", "email": "john@example.com"}]}
     */
    public function users(): JsonResponse
    {
        return $this->sendResponse(['data' => $this->optionService->users()]);
    }

    /**
     * Site options
     *
     * Return sites accessible to the authenticated user for select/dropdown inputs.
     *
     * @response 200 {"data": [{"id": 1, "name": "My Site"}]}
     */
    public function sites(): JsonResponse
    {
        return $this->sendResponse(['data' => $this->optionService->sites()]);
    }

    /**
     * Account options
     *
     * Return accounts accessible to the authenticated user for select/dropdown inputs.
     * Optionally filter by a user's teams by passing `user_id`.
     *
     * @queryParam user_id integer optional Filter accounts by the given user's teams. Example: 1
     *
     * @response 200 {"data": [{"id": 1, "account_id": "act_123", "account_name": "My Account", "team_id": 1}]}
     */
    public function accounts(Request $request): JsonResponse
    {
        $userId = $request->integer('user_id') ?: null;

        return $this->sendResponse(['data' => $this->optionService->accounts($userId)]);
    }

    /**
     * Team options
     *
     * Return teams the authenticated user personally belongs to, for select/dropdown inputs.
     *
     * @response 200 {"data": [{"id": 1, "name": "Team Alpha"}]}
     */
    public function teams(): JsonResponse
    {
        return $this->sendResponse(['data' => $this->optionService->teams()]);
    }

    /**
     * Business center options
     *
     * Return business centers accessible to the authenticated user for select/dropdown inputs.
     *
     * @response 200 {"data": [{"id": 1, "name": "My Business Center"}]}
     */
    public function businessCenters(): JsonResponse
    {
        return $this->sendResponse(['data' => $this->optionService->businessCenters()]);
    }

    /**
     * Ads report options
     *
     * Return teams, accounts, and campaigns for the ads report page.
     *
     * @response 200 {"data": {"show_team_filter": true, "teams": [], "campaigns": []}}
     */
    public function adsReport(): JsonResponse
    {
        return $this->sendResponse(['data' => $this->optionService->adsReport()]);
    }
}

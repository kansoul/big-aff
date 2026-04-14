<?php

namespace App\Http\Controllers\Api;


use App\Http\Requests\Account\ListAccountsRequest;
use App\Http\Requests\Account\StoreAccountRequest;
use App\Http\Requests\Account\UpdateAccountRequest;
use App\Http\Resources\AccountResource;
use App\Models\Account;
use App\Services\Account\AccountService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags Accounts
 */
class AccountController extends BaseController
{
    public function __construct(
        private readonly AccountService $accountService
    ) {}

    /**
     * Account options
     *
     * Return a lightweight list of accounts for use in select/dropdown inputs.
     *
     * @response 200 {"data": [{"id": 1, "account_id": "123456", "account_name": "My Account"}]}
     */
    public function options(): JsonResponse
    {
        return $this->sendResponse(['data' => $this->accountService->options()]);
    }

    /**
     * List accounts
     *
     * Return paginated list of accounts.
     *
     * @queryParam query string Search by account_id or account_name. Example: acc-123
     * @queryParam ads_type string Filter by ads type. Enum: facebook, google. Example: facebook
     * @queryParam business_center_id integer Filter by business center. Example: 1
     * @queryParam team_id integer Filter by team. Example: 1
     * @queryParam status string Filter by status. Example: active
     * @queryParam order_by string Column to sort by. Enum: id, account_id, account_name, ads_type, status, created_at. Example: created_at
     * @queryParam order string Sort direction. Enum: asc, desc. Example: desc
     * @queryParam per_page integer Items per page (max 100). Example: 15
     * @queryParam page integer Page number. Example: 1
     *
     * @response 200 {"data": [{"id": 1, "business_center_id": 1, "business_center": {"id": 1, "name": "My BC"}, "team_id": null, "team": null, "account_id": "123456", "account_name": "My Account", "ads_type": "facebook", "status": "active", "is_special": false, "sync_to_mcc": false, "created_by": 1, "updated_by": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}], "pagination": {"total": 1, "per_page": 15, "current_page": 1, "last_page": 1}}
     */
    public function index(ListAccountsRequest $request): JsonResponse
    {
        $paginator = $this->accountService->list($request->validated());

        return $this->sendResponse([
            'data' => AccountResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Create accounts (batch)
     *
     * Create one or more accounts at once. Shared fields (ads_type, business_center_id, etc.)
     * are applied to every account in the array.
     *
     * @bodyParam ads_type string required Ads platform type. Enum: facebook, google. Example: facebook
     * @bodyParam business_center_id integer optional Business center ID. Example: 1
     * @bodyParam team_id integer optional Team ID. Example: 1
     * @bodyParam status string optional Account status (max 50). Example: active
     * @bodyParam is_special boolean optional Whether to fetch data. Example: false
     * @bodyParam sync_to_mcc boolean optional Whether to sync to MCC. Example: false
     * @bodyParam lines string required List of accounts formatted as account_id|account_name separated by new lines. Example: 123|My Account\n456|Second Account
     *
     * @response 201 {"data": [{"id": 1, "business_center_id": 1, "business_center": null, "team_id": null, "team": null, "account_id": "acc-123", "account_name": "My Account", "ads_type": "facebook", "status": "active", "is_special": false, "sync_to_mcc": false, "created_by": 1, "updated_by": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}], "errors": []}
     * @response 422 {"message": "Please provide at least one account in the format: account_id|account_name", "errors": {"lines": ["Please provide at least one account in the format: account_id|account_name"]}}
     */
    public function store(StoreAccountRequest $request): JsonResponse
    {
        $result = $this->accountService->bulkCreate($request->validated());

        $accounts = Collection::make($result['created'])->load(['businessCenter', 'team']);

        return $this->sendResponse(
            [
                'data' => AccountResource::collection($accounts),
                'errors' => $result['errors'],
            ],
            Response::HTTP_CREATED
        );
    }

    /**
     * Show account
     *
     * Return a single account by ID.
     *
     * @urlParam account integer required The account ID. Example: 1
     *
     * @response 200 {"data": {"id": 1, "business_center_id": 1, "business_center": {"id": 1, "name": "My BC"}, "team_id": null, "team": null, "account_id": "123456", "account_name": "My Account", "ads_type": "facebook", "status": "active", "is_special": false, "sync_to_mcc": false, "created_by": 1, "updated_by": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}}
     * @response 404 {"message": "No query results for model [App\\Models\\Account] 1"}
     */
    public function show(Account $account): JsonResponse
    {
        $account->load(['businessCenter', 'team']);

        return $this->sendResponse(
            ['data' => new AccountResource($account)]
        );
    }

    /**
     * Update account
     *
     * Update an existing account (partial update supported).
     *
     * @urlParam account integer required The account ID. Example: 1
     *
     * @bodyParam account_id string optional External account ID (unique, max 255). Example: acc-456
     * @bodyParam account_name string optional Account display name (max 255). Example: Updated Account
     * @bodyParam ads_type string optional Ads platform type. Enum: facebook, google. Example: google
     * @bodyParam business_center_id integer optional Business center ID. Pass null to remove. Example: 1
     * @bodyParam team_id integer optional Team ID. Pass null to remove. Example: 1
     * @bodyParam status string optional Account status (max 50). Pass null to remove. Example: paused
     * @bodyParam is_special boolean optional Whether to fetch data. Example: true
     * @bodyParam sync_to_mcc boolean optional Whether to sync to MCC. Example: true
     *
     * @response 200 {"data": {"id": 1, "business_center_id": 1, "business_center": {"id": 1, "name": "My BC"}, "team_id": null, "team": null, "account_id": "acc-456", "account_name": "Updated Account", "ads_type": "google", "status": "paused", "is_special": true, "sync_to_mcc": true, "created_by": 1, "updated_by": 2, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-06-01T00:00:00+00:00"}}
     * @response 403 {"message": "This action is unauthorized."}
     * @response 404 {"message": "No query results for model [App\\Models\\Account] 1"}
     */
    public function update(UpdateAccountRequest $request, Account $account): JsonResponse
    {
        $updated = $this->accountService->update($account, $request->validated());

        return $this->sendResponse(
            ['data' => new AccountResource($updated)]
        );
    }

    /**
     * Delete account
     *
     * Soft-delete an account.
     *
     * @urlParam account integer required The account ID. Example: 1
     *
     * @response 204 {}
     * @response 403 {"message": "This action is unauthorized."}
     * @response 404 {"message": "No query results for model [App\\Models\\Account] 1"}
     */
    public function destroy(Account $account): JsonResponse
    {
        $this->accountService->delete($account);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }
}

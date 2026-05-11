<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Adx\Account\AssignAdxAccountRequest;
use App\Http\Requests\Adx\Account\ListAdxAccountsRequest;
use App\Http\Requests\Adx\Account\ListUsersWithAdxAccountsRequest;
use App\Http\Requests\Adx\Account\StoreAdxAccountRequest;
use App\Http\Requests\Adx\Account\UpdateAdxAccountRequest;
use App\Http\Resources\Adx\AdxAccountResource;
use App\Models\AdxAccount;
use App\Models\User;
use App\Services\Adx\AdxAccountService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags AdX Accounts
 */
class AdxAccountController extends BaseController
{
    public function __construct(
        private readonly AdxAccountService $service,
    ) {}

    public function index(ListAdxAccountsRequest $request): JsonResponse
    {
        $paginator = $this->service->list($request->validated());

        return $this->sendResponse([
            'data' => AdxAccountResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    public function store(StoreAdxAccountRequest $request): JsonResponse
    {
        $account = $this->service->create($request->validated());

        return $this->sendResponse(['data' => new AdxAccountResource($account)], Response::HTTP_CREATED);
    }

    public function show(AdxAccount $adxAccount): JsonResponse
    {
        $adxAccount->load(['businessCenter', 'mainTeam', 'team', 'users']);

        return $this->sendResponse(['data' => new AdxAccountResource($adxAccount)]);
    }

    public function update(UpdateAdxAccountRequest $request, AdxAccount $adxAccount): JsonResponse
    {
        $account = $this->service->update($adxAccount, $request->validated());

        return $this->sendResponse(['data' => new AdxAccountResource($account)]);
    }

    public function destroy(AdxAccount $adxAccount): JsonResponse
    {
        $this->service->delete($adxAccount);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }

    public function assignOptions(Request $request): JsonResponse
    {
        $userId = $request->integer('user_id') ?: null;

        return $this->sendResponse(['data' => $this->service->assignOptions($userId)]);
    }

    public function listUsersWithAccounts(ListUsersWithAdxAccountsRequest $request): JsonResponse
    {
        $paginator = $this->service->listUsersWithAccounts($request->validated());

        $data = collect($paginator->items())->map(fn (User $user) => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'accounts' => $user->adxAccounts->map(fn (AdxAccount $account) => [
                'id' => $account->id,
                'source' => $account->source,
                'account_id' => $account->account_id,
                'account_name' => $account->account_name,
            ])->values(),
        ]);

        return $this->sendResponse([
            'data' => $data,
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    public function assignToUser(AssignAdxAccountRequest $request, User $user): JsonResponse
    {
        $result = $this->service->assignToUser($user, $request->validated('account_ids', []));

        return $this->sendResponse(['skipped_account_ids' => $result['skipped_account_ids']]);
    }
}

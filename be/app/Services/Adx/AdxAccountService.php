<?php

namespace App\Services\Adx;

use App\Actions\Adx\Account\AssignAdxAccountAction;
use App\Actions\Adx\Account\BulkCreateAdxAccountsAction;
use App\Actions\Adx\Account\CreateAdxAccountAction;
use App\Actions\Adx\Account\DeleteAdxAccountAction;
use App\Actions\Adx\Account\GetAdxAccountAssignOptionsAction;
use App\Actions\Adx\Account\ListAdxAccountsAction;
use App\Actions\Adx\Account\ListUsersWithAdxAccountsAction;
use App\Actions\Adx\Account\UpdateAdxAccountAction;
use App\Models\AdxAccount;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class AdxAccountService
{
    public function __construct(
        private readonly ListAdxAccountsAction $listAction,
        private readonly CreateAdxAccountAction $createAction,
        private readonly BulkCreateAdxAccountsAction $bulkCreateAction,
        private readonly UpdateAdxAccountAction $updateAction,
        private readonly DeleteAdxAccountAction $deleteAction,
        private readonly GetAdxAccountAssignOptionsAction $assignOptionsAction,
        private readonly ListUsersWithAdxAccountsAction $listUsersAction,
        private readonly AssignAdxAccountAction $assignAction,
    ) {}

    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listAction->execute($filters);
    }

    public function create(array $data): AdxAccount
    {
        return $this->createAction->execute($data);
    }

    /**
     * @return array{created: list<AdxAccount>, errors: list<string>}
     */
    public function bulkCreate(array $data): array
    {
        return $this->bulkCreateAction->execute($data);
    }

    public function update(AdxAccount $account, array $data): AdxAccount
    {
        return $this->updateAction->execute($account, $data);
    }

    public function delete(AdxAccount $account): void
    {
        $this->deleteAction->execute($account);
    }

    public function assignOptions(?int $forUserId = null): Collection
    {
        return $this->assignOptionsAction->execute($forUserId);
    }

    public function listUsersWithAccounts(array $filters): LengthAwarePaginator
    {
        return $this->listUsersAction->execute($filters);
    }

    public function assignToUser(User $user, array $accountIds): array
    {
        return $this->assignAction->execute($user, $accountIds);
    }
}

<?php

namespace App\Services\Account;

use App\Actions\Account\AssignAccountAction;
use App\Actions\Account\BulkCreateAccountAction;
use App\Actions\Account\DeleteAccountAction;
use App\Actions\Account\GetAccountAssignOptionsAction;
use App\Actions\Account\ListAccountsAction;
use App\Actions\Account\ListUsersWithAccountsAction;
use App\Actions\Account\UpdateAccountAction;
use App\Models\Account;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class AccountService
{
    public function __construct(
        private readonly ListAccountsAction $listAccountsAction,
        private readonly BulkCreateAccountAction $bulkCreateAccountAction,
        private readonly UpdateAccountAction $updateAccountAction,
        private readonly DeleteAccountAction $deleteAccountAction,
        private readonly GetAccountAssignOptionsAction $getAccountAssignOptionsAction,
        private readonly ListUsersWithAccountsAction $listUsersWithAccountsAction,
        private readonly AssignAccountAction $assignAccountAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listAccountsAction->execute($filters);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{created: list<Account>, errors: list<string>}
     */
    public function bulkCreate(array $data): array
    {
        return $this->bulkCreateAccountAction->execute($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Account $account, array $data): Account
    {
        return $this->updateAccountAction->execute($account, $data);
    }

    public function delete(Account $account): void
    {
        $this->deleteAccountAction->execute($account);
    }

    /**
     * @return Collection<int, array{id: int, account_id: string, account_name: string|null, team_id: int|null}>
     */
    public function assignOptions(?int $forUserId = null): Collection
    {
        return $this->getAccountAssignOptionsAction->execute($forUserId);
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    public function listUsersWithAccounts(array $filters): LengthAwarePaginator
    {
        return $this->listUsersWithAccountsAction->execute($filters);
    }

    /**
     * @param  array<string>  $accountIds
     * @return array{skipped_account_ids: list<string>}
     */
    public function assignToUser(User $user, array $accountIds): array
    {
        return $this->assignAccountAction->execute($user, $accountIds);
    }
}

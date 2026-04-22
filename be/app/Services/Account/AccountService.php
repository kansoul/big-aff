<?php

namespace App\Services\Account;

use App\Actions\Account\AssignAccountAction;
use App\Actions\Account\BulkCreateAccountAction;
use App\Actions\Account\DeleteAccountAction;
use App\Actions\Account\GetAccountOptionsAction;
use App\Actions\Account\ListAccountsAction;
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
        private readonly GetAccountOptionsAction $getAccountOptionsAction,
        private readonly AssignAccountAction $assignAccountAction,
    ) {}

    /**
     * @return Collection<int, array{id: int, account_id: string, account_name: string|null, team_id: int|null}>
     */
    public function options(?int $userId = null): Collection
    {
        return $this->getAccountOptionsAction->execute($userId);
    }

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
     * @param  array<int>  $accountIds
     */
    public function assignToUser(User $user, array $accountIds): void
    {
        $this->assignAccountAction->execute($user, $accountIds);
    }
}

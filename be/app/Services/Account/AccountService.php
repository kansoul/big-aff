<?php

namespace App\Services\Account;

use App\Actions\Account\BulkCreateAccountAction;
use App\Actions\Account\DeleteAccountAction;
use App\Actions\Account\GetAccountOptionsAction;
use App\Actions\Account\ListAccountsAction;
use App\Actions\Account\UpdateAccountAction;
use App\Models\Account;
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
    ) {}

    /**
     * @return Collection<int, array{id: int, account_id: string, account_name: string|null}>
     */
    public function options(): Collection
    {
        return $this->getAccountOptionsAction->execute();
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
}

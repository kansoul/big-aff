<?php

namespace App\Actions\Account;

use App\Models\Account;
use App\Support\OwnerResource\AccountLinkedOwnerResource;
use Illuminate\Support\Collection;

class GetAccountAssignOptionsAction
{
    /**
     * Returns all accounts accessible to the auth user.
     * Assignment filtering is handled at save time, not here.
     *
     * @return Collection<int, array{id: int, account_id: string, account_name: string|null, team_id: int|null}>
     */
    public function execute(?int $forUserId = null): Collection
    {
        $query = Account::query()
            ->select(['id', 'account_id', 'account_name', 'team_id'])
            ->orderBy('account_name');

        (new AccountLinkedOwnerResource)->applyTo($query);

        return $query->get();
    }
}

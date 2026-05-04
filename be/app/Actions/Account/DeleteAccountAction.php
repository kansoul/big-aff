<?php

namespace App\Actions\Account;

use App\Models\Account;
use App\Support\OwnerResource\AccountOwnerResource;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteAccountAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(Account $account): void
    {
        (new AccountOwnerResource)->authorize($account);

        $account->delete();
    }
}

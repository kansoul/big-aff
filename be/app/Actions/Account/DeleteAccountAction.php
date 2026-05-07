<?php

namespace App\Actions\Account;

use App\Models\Account;
use App\Support\Accounts\AccountsAccess;
use App\Support\OwnerResource\AccountOwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;

class DeleteAccountAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(Account $account): void
    {
        if (! AccountsAccess::canViewUnscoped(Auth::user())) {
            (new AccountOwnerResource)->authorize($account);
        }

        $account->delete();
    }
}

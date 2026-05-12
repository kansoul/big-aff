<?php

namespace App\Actions\Adx\Account;

use App\Models\AdxAccount;
use App\Support\Accounts\AccountsAccess;
use App\Support\OwnerResource\AdxAccountOwnerResource;
use Illuminate\Support\Facades\Auth;

class DeleteAdxAccountAction
{
    public function execute(AdxAccount $account): void
    {
        if (! AccountsAccess::canViewUnscoped(Auth::user())) {
            (new AdxAccountOwnerResource)->authorize($account);
        }

        $account->delete();
    }
}

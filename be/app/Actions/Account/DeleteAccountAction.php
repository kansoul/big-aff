<?php

namespace App\Actions\Account;

use App\Models\Account;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteAccountAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(Account $account): void
    {
        OwnershipFilter::forAuthUser()->authorizeAccount($account);

        $account->delete();
    }
}

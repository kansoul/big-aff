<?php

namespace App\Actions\Account;

use App\Models\Account;
use App\Support\Accounts\AccountsAccess;
use App\Support\Gtag\GtagResolver;
use App\Support\OwnerResource\AccountOwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;

class DeleteAccountAction
{
    public function __construct(
        private readonly GtagResolver $gtagResolver = new GtagResolver,
    ) {}

    /**
     * @throws AuthorizationException
     */
    public function execute(Account $account): void
    {
        if (! AccountsAccess::canViewUnscoped(Auth::user())) {
            (new AccountOwnerResource)->authorize($account);
        }

        $account->delete();

        $this->gtagResolver->forget($account->account_id);
    }
}

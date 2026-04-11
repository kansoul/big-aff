<?php

namespace App\Actions\Account;

use App\Models\Account;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;

class UpdateAccountAction
{
    /**
     * @param  array<string, mixed>  $data
     *
     * @throws AuthorizationException
     */
    public function execute(Account $account, array $data): Account
    {
        OwnershipFilter::forAuthUser()->authorize($account->created_by);

        $data['updated_by'] = Auth::id();
        $account->update($data);

        return $account->fresh(['businessCenter', 'team']);
    }
}

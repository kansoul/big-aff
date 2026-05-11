<?php

namespace App\Actions\Adx\Account;

use App\Models\AdxAccount;
use App\Support\Accounts\AccountsAccess;
use App\Support\OwnerResource\AdxAccountOwnerResource;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UpdateAdxAccountAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(AdxAccount $account, array $data): AdxAccount
    {
        if (! AccountsAccess::canViewUnscoped(Auth::user())) {
            (new AdxAccountOwnerResource)->authorize($account);
        }

        return DB::transaction(function () use ($account, $data): AdxAccount {
            $account->fill([
                ...collect($data)->except('user_id')->toArray(),
                'updated_by' => Auth::id(),
            ]);
            $account->save();

            if (array_key_exists('user_id', $data)) {
                $userId = $data['user_id'] ? (int) $data['user_id'] : null;
                $account->users()->sync($userId ? [$userId] : []);
            }

            return $account->load(['businessCenter', 'mainTeam', 'team', 'users']);
        });
    }
}

<?php

namespace App\Actions\Adx\Account;

use App\Models\AdxAccount;
use App\Support\Accounts\AccountsAccess;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class CreateAdxAccountAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): AdxAccount
    {
        $userId = isset($data['user_id']) ? (int) $data['user_id'] : null;
        if ($userId === null && ! AccountsAccess::canViewUnscoped(Auth::user())) {
            $userId = Auth::id();
        }

        return DB::transaction(function () use ($data, $userId): AdxAccount {
            $account = AdxAccount::query()->create([
                ...collect($data)->except('user_id')->toArray(),
                'created_by' => Auth::id(),
            ]);

            if ($userId !== null) {
                $account->users()->sync([$userId]);
            }

            return $account->load(['businessCenter', 'mainTeam', 'team', 'users']);
        });
    }
}

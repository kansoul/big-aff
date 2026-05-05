<?php

namespace App\Actions\Account;

use App\Models\Account;
use App\Support\OwnerResource\AccountOwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class UpdateAccountAction
{
    /**
     * @param  array<string, mixed>  $data
     *
     * @throws AuthorizationException
     */
    public function execute(Account $account, array $data): Account
    {
        (new AccountOwnerResource)->authorize($account);

        $user = Auth::user();
        $userId = array_key_exists('user_id', $data) ? ($data['user_id'] !== null ? (int) $data['user_id'] : null) : false;

        // If user_id is explicitly set to null (or not provided in a way that maps to null)
        // and current user is not admin, auto-assign to current user to prevent loss of visibility.
        if ($userId === null && ! $user?->is_admin) {
            $userId = $user?->id;
        }
        unset($data['user_id']);

        $data['updated_by'] = Auth::id();
        $account->update($data);

        if ($userId !== false) {
            DB::table('account_user')->where('account_id', $account->id)->delete();

            if ($userId !== null) {
                DB::table('account_user')->insert([
                    'user_id' => $userId,
                    'account_id' => $account->id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        return $account->fresh(['businessCenter', 'users']);
    }
}

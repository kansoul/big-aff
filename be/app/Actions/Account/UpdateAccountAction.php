<?php

namespace App\Actions\Account;

use App\Models\Account;
use App\Support\OwnershipFilter\OwnershipFilter;
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
        OwnershipFilter::forAuthUser()->authorize($account->created_by);

        $userId = array_key_exists('user_id', $data) ? ($data['user_id'] !== null ? (int) $data['user_id'] : null) : false;
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

        return $account->fresh(['businessCenter', 'team']);
    }
}

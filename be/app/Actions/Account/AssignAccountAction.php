<?php

namespace App\Actions\Account;

use App\Models\User;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class AssignAccountAction
{
    /**
     * Assign a list of accounts to a user.
     *
     * @param  array<int>  $accountIds
     *
     * @throws AuthorizationException
     */
    public function execute(User $user, array $accountIds): void
    {
        $ownership = OwnershipFilter::forAuthUser();

        // Auth user must be allowed to manage the target user
        if (! in_array($user->id, $ownership->allowedUserIds(), true)) {
            throw new AuthorizationException;
        }

        // Only assign accounts that the auth user owns
        $allowedAccountIds = DB::table('accounts')
            ->whereIn('id', $accountIds)
            ->whereIn('created_by', $ownership->allowedUserIds())
            ->whereNull('deleted_at')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        if (empty($allowedAccountIds)) {
            return;
        }

        DB::transaction(function () use ($user, $allowedAccountIds): void {
            $existing = DB::table('account_user')
                ->where('user_id', $user->id)
                ->whereIn('account_id', $allowedAccountIds)
                ->pluck('account_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $toInsert = array_diff($allowedAccountIds, $existing);

            if (! empty($toInsert)) {
                $now = now();
                $rows = array_map(fn (int $accountId) => [
                    'user_id' => $user->id,
                    'account_id' => $accountId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $toInsert);

                DB::table('account_user')->insert($rows);
            }
        });
    }
}

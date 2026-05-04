<?php

namespace App\Actions\Account;

use App\Models\Account;
use App\Models\User;
use App\Support\OwnerResource\AccountLinkedOwnerResource;
use App\Support\OwnerResource\UserOwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AssignAccountAction
{
    /**
     * Sync a user's account assignments (1-n: each account belongs to at most one user).
     * Only accounts belonging to the user's teams are affected.
     *
     * @param  array<int>  $accountIds
     *
     * @throws AuthorizationException
     */
    public function execute(User $user, array $accountIds): void
    {
        (new UserOwnerResource)->authorize($user);

        $authUserId = (int) Auth::id();

        // All accounts accessible to the auth user
        $accessibleQuery = Account::query()->select('id');
        (new AccountLinkedOwnerResource)->applyTo($accessibleQuery);
        $accessibleAccountIds = $accessibleQuery
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        // Filter requested IDs to only accessible accounts
        $allowedAccountIds = array_values(array_intersect(
            array_map('intval', $accountIds),
            $accessibleAccountIds,
        ));

        DB::transaction(function () use ($user, $allowedAccountIds, $accessibleAccountIds, $authUserId): void {
            // Accounts previously assigned to this user (within accessible scope)
            $previouslyAssigned = DB::table('account_user')
                ->where('user_id', $user->id)
                ->whereIn('account_id', $accessibleAccountIds)
                ->pluck('account_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $removedAccountIds = array_values(array_diff($previouslyAssigned, $allowedAccountIds));

            // Remove all existing assignments for this user (within accessible scope)
            DB::table('account_user')
                ->where('user_id', $user->id)
                ->whereIn('account_id', $accessibleAccountIds)
                ->delete();

            if (! empty($allowedAccountIds)) {
                // Enforce 1-n: remove any other user's assignment for these accounts
                DB::table('account_user')
                    ->whereIn('account_id', $allowedAccountIds)
                    ->where('user_id', '!=', $user->id)
                    ->delete();

                $now = now();
                DB::table('account_user')->insert(
                    array_map(fn (int $accountId) => [
                        'user_id' => $user->id,
                        'account_id' => $accountId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ], $allowedAccountIds),
                );
            }

            // Re-assign removed accounts back to the auth user (if they differ from target user)
            if (! empty($removedAccountIds) && $authUserId !== $user->id) {
                // Only accounts not already assigned to someone else
                $alreadyAssigned = DB::table('account_user')
                    ->whereIn('account_id', $removedAccountIds)
                    ->pluck('account_id')
                    ->map(fn ($id) => (int) $id)
                    ->all();

                $toReassign = array_values(array_diff($removedAccountIds, $alreadyAssigned));

                if (! empty($toReassign)) {
                    $now = now();
                    DB::table('account_user')->insert(
                        array_map(fn (int $accountId) => [
                            'user_id' => $authUserId,
                            'account_id' => $accountId,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ], $toReassign),
                    );
                }
            }
        });
    }
}

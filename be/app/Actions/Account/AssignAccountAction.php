<?php

namespace App\Actions\Account;

use App\Models\User;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;
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
        $ownership = OwnershipFilter::forAuthUser();

        if (! $ownership->isAdmin() && ! \in_array($user->id, $ownership->allowedUserIds(), true)) {
            throw new AuthorizationException;
        }

        // Get user's team IDs
        $userTeamIds = DB::table('team_user')
            ->where('user_id', $user->id)
            ->pluck('team_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        // All accounts in user's teams
        $teamAccountIds = DB::table('accounts')
            ->whereNull('deleted_at')
            ->whereIn('team_id', $userTeamIds)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        // Filter requested account_ids to only those in user's teams
        $allowedAccountIds = array_values(array_intersect(
            array_map('intval', $accountIds),
            $teamAccountIds,
        ));

        DB::transaction(function () use ($user, $allowedAccountIds, $teamAccountIds): void {
            // Remove all existing assignments for this user within their teams (sync)
            DB::table('account_user')
                ->where('user_id', $user->id)
                ->whereIn('account_id', $teamAccountIds)
                ->delete();

            if (empty($allowedAccountIds)) {
                return;
            }

            // Enforce 1-n: remove any other user's assignment for these accounts
            DB::table('account_user')
                ->whereIn('account_id', $allowedAccountIds)
                ->where('user_id', '!=', $user->id)
                ->delete();

            $now = now();
            $rows = array_map(fn (int $accountId) => [
                'user_id' => $user->id,
                'account_id' => $accountId,
                'created_at' => $now,
                'updated_at' => $now,
            ], $allowedAccountIds);

            DB::table('account_user')->insert($rows);
        });
    }
}

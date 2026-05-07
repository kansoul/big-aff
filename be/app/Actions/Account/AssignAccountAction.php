<?php

namespace App\Actions\Account;

use App\Models\Account;
use App\Models\User;
use App\Support\Accounts\AccountsAccess;
use App\Support\OwnerResource\AccountLinkedOwnerResource;
use App\Support\OwnerResource\UserOwnerResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AssignAccountAction
{
    /**
     * Sync a user's account assignments from account_id values.
     * Accounts already assigned to another user are skipped and returned.
     *
     * @param  array<string>  $accountIds
     * @return array{skipped_account_ids: list<string>}
     *
     * @throws AuthorizationException
     */
    public function execute(User $user, array $accountIds): array
    {
        $canViewUnscoped = AccountsAccess::canViewUnscoped(Auth::user());

        if (! $canViewUnscoped) {
            (new UserOwnerResource)->authorize($user);
        }

        $requestedAccountIds = collect($accountIds)
            ->map(fn ($id) => trim((string) $id))
            ->filter()
            ->unique()
            ->values();

        /** @var Collection<int, Account> $accessibleAccounts */
        $accessibleQuery = Account::query()->select(['id', 'account_id']);
        if (! $canViewUnscoped) {
            (new AccountLinkedOwnerResource)->applyTo($accessibleQuery);
        }
        $accessibleAccounts = $accessibleQuery->get();

        $accessibleAccountDbIds = $accessibleAccounts
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $requestedAccounts = $accessibleAccounts
            ->whereIn('account_id', $requestedAccountIds)
            ->keyBy('id');

        $requestedAccountDbIds = $requestedAccounts
            ->keys()
            ->map(fn ($id) => (int) $id)
            ->all();

        $requesterId = (int) Auth::id();
        $skippedAccountIds = [];

        DB::transaction(function () use (
            $user,
            $requestedAccountDbIds,
            $requestedAccounts,
            $accessibleAccountDbIds,
            $requesterId,
            &$skippedAccountIds
        ): void {
            Account::whereIn('id', $requestedAccountDbIds)->lockForUpdate()->get(['id']);

            $takenRows = DB::table('account_user')
                ->whereIn('account_id', $requestedAccountDbIds)
                ->where('user_id', '!=', $user->id)
                ->get(['account_id', 'user_id']);

            $requesterOwnedIds = [];
            $skippedIds = [];

            foreach ($takenRows as $row) {
                $accountDbId = (int) $row->account_id;
                if ((int) $row->user_id === $requesterId) {
                    $requesterOwnedIds[] = $accountDbId;
                } else {
                    $skippedIds[] = $accountDbId;
                    if ($requestedAccounts->has($accountDbId)) {
                        $skippedAccountIds[] = $requestedAccounts->get($accountDbId)->account_id;
                    }
                }
            }

            if (! empty($requesterOwnedIds)) {
                DB::table('account_user')
                    ->where('user_id', $requesterId)
                    ->whereIn('account_id', $requesterOwnedIds)
                    ->delete();
            }

            $allowedIds = array_values(array_diff($requestedAccountDbIds, $skippedIds));

            $removedAccountIds = [];
            if ($requesterId !== (int) $user->id) {
                $removedAccountIds = DB::table('account_user')
                    ->where('user_id', $user->id)
                    ->whereIn('account_id', $accessibleAccountDbIds)
                    ->when(! empty($allowedIds), fn ($q) => $q->whereNotIn('account_id', $allowedIds))
                    ->pluck('account_id')
                    ->map(fn ($id) => (int) $id)
                    ->all();
            }

            DB::table('account_user')
                ->where('user_id', $user->id)
                ->whereIn('account_id', $accessibleAccountDbIds)
                ->when(! empty($allowedIds), fn ($q) => $q->whereNotIn('account_id', $allowedIds))
                ->delete();

            if (! empty($removedAccountIds)) {
                $alreadyAssigned = DB::table('account_user')
                    ->whereIn('account_id', $removedAccountIds)
                    ->pluck('account_id')
                    ->map(fn ($id) => (int) $id)
                    ->all();

                $toReassign = array_values(array_diff($removedAccountIds, $alreadyAssigned));

                if (! empty($toReassign)) {
                    $now = now();
                    DB::table('account_user')->insert(
                        array_map(fn (int $accountDbId) => [
                            'user_id' => $requesterId,
                            'account_id' => $accountDbId,
                            'created_at' => $now,
                            'updated_at' => $now,
                        ], $toReassign),
                    );
                }
            }

            if (empty($allowedIds)) {
                return;
            }

            $existing = DB::table('account_user')
                ->where('user_id', $user->id)
                ->whereIn('account_id', $allowedIds)
                ->pluck('account_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $toInsert = array_values(array_diff($allowedIds, $existing));

            if (! empty($toInsert)) {
                $now = now();
                DB::table('account_user')->insert(
                    array_map(fn (int $accountDbId) => [
                        'user_id' => $user->id,
                        'account_id' => $accountDbId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ], $toInsert),
                );
            }
        });

        return ['skipped_account_ids' => array_values(array_unique($skippedAccountIds))];
    }
}

<?php

namespace App\Support\ReportOwner;

use App\Models\Account;

/**
 * Resolves the owner (user + main team) of an account at sync time so
 * revenue/spend rows can be stamped with owner_user_id / owner_main_team_id.
 *
 * An account is currently assigned to a single user, so the latest pivot
 * row wins. Results are memoized per instance — create one resolver per sync run.
 */
class ReportOwnerResolver
{
    /** @var array<string, array{owner_user_id: int|null, owner_main_team_id: int|null}> */
    private array $accountCache = [];

    /**
     * Owner attribution for an account, keyed by its external `account_id` string.
     *
     * @return array{owner_user_id: int|null, owner_main_team_id: int|null}
     */
    public function forAccountId(?string $externalAccountId): array
    {
        if (blank($externalAccountId)) {
            return $this->emptyOwner();
        }

        return $this->accountCache[$externalAccountId] ??= $this->resolveAccountOwner($externalAccountId);
    }

    /**
     * @return array{owner_user_id: int|null, owner_main_team_id: int|null}
     */
    private function resolveAccountOwner(string $externalAccountId): array
    {
        $account = Account::query()
            ->where('accounts.account_id', $externalAccountId)
            ->leftJoin('account_user', 'account_user.account_id', '=', 'accounts.id')
            ->orderByDesc('account_user.id')
            ->first(['accounts.main_team_id', 'account_user.user_id as owner_user_id']);

        if (! $account) {
            return $this->emptyOwner();
        }

        return [
            'owner_user_id' => $account->owner_user_id !== null ? (int) $account->owner_user_id : null,
            'owner_main_team_id' => $account->main_team_id !== null ? (int) $account->main_team_id : null,
        ];
    }

    /**
     * @return array{owner_user_id: int|null, owner_main_team_id: int|null}
     */
    private function emptyOwner(): array
    {
        return ['owner_user_id' => null, 'owner_main_team_id' => null];
    }
}

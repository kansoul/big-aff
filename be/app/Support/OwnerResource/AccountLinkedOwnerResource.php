<?php

namespace App\Support\OwnerResource;

use App\Models\Account;
use App\Support\OwnerResource\Base\OwnerResource;
use Illuminate\Database\Eloquent\Builder;

/**
 * For models that reference an Account via the `account_id` string FK (Campaign, InsightReport, etc.).
 * Filters by accounts the allowed users have access to via the `account_user` pivot.
 *
 * Also usable on the Account model itself (WHERE account_id IN accessible account_ids).
 */
final class AccountLinkedOwnerResource extends OwnerResource
{
    protected function scope(Builder $query, array $allowedIds): void
    {
        $query->whereIn(
            'account_id',
            Account::join('account_user', 'account_user.account_id', '=', 'accounts.id')
                ->whereIn('account_user.user_id', $allowedIds)
                ->select('accounts.account_id'),
        );
    }
}

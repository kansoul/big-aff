<?php

namespace App\Support\OwnerResource;

use App\Models\AdxAccount;
use App\Support\OwnerResource\Base\OwnerResource;
use Illuminate\Database\Eloquent\Builder;

/**
 * For models linked to an AdX account by the external `account_id` string.
 */
final class AdxAccountLinkedOwnerResource extends OwnerResource
{
    protected function scope(Builder $query, array $allowedIds): void
    {
        $query->whereIn(
            'account_id',
            AdxAccount::query()
                ->join('adx_account_user', 'adx_account_user.adx_account_id', '=', 'adx_accounts.id')
                ->whereIn('adx_account_user.user_id', $allowedIds)
                ->select('adx_accounts.account_id'),
        );
    }
}

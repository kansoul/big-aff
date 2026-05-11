<?php

namespace App\Actions\Adx\Account;

use App\Models\AdxAccount;
use App\Support\Accounts\AccountsAccess;
use App\Support\OwnerResource\AdxAccountOwnerResource;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class GetAdxAccountAssignOptionsAction
{
    /**
     * @return Collection<int, array{id: int, account_id: string, account_name: string|null, source: string}>
     */
    public function execute(?int $forUserId = null): Collection
    {
        $query = AdxAccount::query()
            ->select(['id', 'source', 'account_id', 'account_name'])
            ->where('status', 'ACTIVE');

        if (! AccountsAccess::canViewUnscoped(Auth::user())) {
            (new AdxAccountOwnerResource)->applyTo($query);
        }

        return $query->orderBy('source')
            ->orderBy('account_name')
            ->get()
            ->map(fn (AdxAccount $account) => [
                'id' => $account->id,
                'source' => $account->source,
                'account_id' => $account->account_id,
                'account_name' => $account->account_name,
            ]);
    }
}

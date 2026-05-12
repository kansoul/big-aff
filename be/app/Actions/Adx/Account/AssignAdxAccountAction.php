<?php

namespace App\Actions\Adx\Account;

use App\Models\AdxAccount;
use App\Models\User;
use App\Support\Accounts\AccountsAccess;
use App\Support\OwnerResource\AdxAccountOwnerResource;
use App\Support\OwnerResource\UserOwnerResource;
use Illuminate\Support\Facades\Auth;

class AssignAdxAccountAction
{
    /**
     * @param  array<string>  $accountIds
     * @return array{skipped_account_ids: list<string>}
     */
    public function execute(User $user, array $accountIds): array
    {
        if (! AccountsAccess::canViewUnscoped(Auth::user())) {
            (new UserOwnerResource)->authorize($user);
        }

        $requestedIds = collect($accountIds)
            ->map(fn ($id) => trim((string) $id))
            ->filter()
            ->unique()
            ->values();

        $query = AdxAccount::query()->select(['id', 'account_id']);
        if (! AccountsAccess::canViewUnscoped(Auth::user())) {
            (new AdxAccountOwnerResource)->applyTo($query);
        }

        $accounts = $query->whereIn('account_id', $requestedIds)->get();
        $user->adxAccounts()->sync($accounts->pluck('id')->all());

        $foundIds = $accounts->pluck('account_id')->all();

        return ['skipped_account_ids' => $requestedIds->diff($foundIds)->values()->all()];
    }
}

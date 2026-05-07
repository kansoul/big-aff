<?php

namespace App\Actions\Option;

use App\Enums\UserStatus;
use App\Models\User;
use App\Support\Accounts\AccountsAccess;
use App\Support\OwnerResource\UserOwnerResource;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

class GetUserOptionsAction
{
    /**
     * @return Collection<int, array{id: int, name: string, email: string}>
     */
    public function execute(): Collection
    {
        $query = User::query()
            ->select(['id', 'name', 'email'])
            ->where('status', UserStatus::Active)
            ->orderBy('name');

        if (! AccountsAccess::canViewUnscoped(Auth::user())) {
            (new UserOwnerResource)->applyTo($query);
        }

        return $query->get();
    }
}

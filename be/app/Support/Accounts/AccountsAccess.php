<?php

namespace App\Support\Accounts;

use App\Models\User;

final class AccountsAccess
{
    public static function isUnscopedRole(?User $user): bool
    {
        $roleId = config('accounts.unscoped_role_id');

        return $user !== null
            && $roleId !== null
            && (int) $user->role_id === (int) $roleId;
    }

    public static function canViewUnscoped(?User $user): bool
    {
        return $user !== null && ($user->is_admin || self::isUnscopedRole($user));
    }

    public static function canUseMainTeams(?User $user): bool
    {
        return config('main_system.is_main') && self::canViewUnscoped($user);
    }
}

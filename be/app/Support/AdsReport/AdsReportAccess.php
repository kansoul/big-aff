<?php

namespace App\Support\AdsReport;

use App\Models\User;

final class AdsReportAccess
{
    public static function isAccounting(?User $user): bool
    {
        $roleId = config('ads_report.accounting_role_id');

        return $user !== null
            && $roleId !== null
            && (int) $user->role_id === (int) $roleId;
    }

    public static function canViewUnscoped(?User $user): bool
    {
        return $user !== null && ($user->is_admin || self::isAccounting($user));
    }

    public static function canUseMainTeams(?User $user): bool
    {
        return config('main_system.is_main') && self::canViewUnscoped($user);
    }
}

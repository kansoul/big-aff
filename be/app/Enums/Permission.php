<?php

namespace App\Enums;

/**
 * Bit flags stored in `roles.permission_mask`. One case = one bit.
 * Route middleware `permission.scope:` uses pipe-separated integer bit values (same as case values).
 */
enum Permission: int
{
    // —— Report ——
    case ReportOverviewView = 1 << 0;

    case ReportExport = 1 << 1;

        // —— Settings → Users ——
    case SettingsUsersView = 1 << 2;

    case SettingsUsersCreate = 1 << 3;

    case SettingsUsersUpdate = 1 << 4;

    case SettingsUsersDelete = 1 << 5;

        // —— Settings → Roles ——
    case SettingsRolesView = 1 << 6;

    case SettingsRolesCreate = 1 << 7;

    case SettingsRolesUpdate = 1 << 8;

    case SettingsRolesDelete = 1 << 9;

    case SettingsRolesAssign = 1 << 10;

    public static function fullMask(): int
    {
        static $cached = null;

        if ($cached === null) {
            $m = 0;
            foreach (self::cases() as $case) {
                $m |= $case->value;
            }
            $cached = $m;
        }

        return $cached;
    }

    public static function maskHasFullAccess(int $mask): bool
    {
        return $mask !== 0 && ($mask & self::fullMask()) === self::fullMask();
    }

    /**
     * Bitmask check shared by {@see User::hasPermissionFlag()} and route middleware (avoids repeated role loads).
     */
    public static function maskHasPermission(int $mask, self $permission): bool
    {
        if (self::maskHasFullAccess($mask)) {
            return true;
        }

        return ($mask & $permission->value) === $permission->value;
    }

    /**
     * Route middleware argument: pipe-separated permission bit integers (each must match a case value).
     * Full access is represented only by the bitmask (all bits set), not by a magic token.
     */
    public static function maskAllowsAnyOf(int $mask, string $pipeSeparated): bool
    {
        foreach (self::parseRoutePermissionTokens($pipeSeparated) as $token) {
            if (! ctype_digit($token)) {
                continue;
            }

            $perm = self::tryFrom((int) $token);
            if ($perm !== null && self::maskHasPermission($mask, $perm)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<string>
     */
    private static function parseRoutePermissionTokens(string $pipeSeparated): array
    {
        $parts = array_map('trim', explode('|', $pipeSeparated));

        return array_values(array_filter($parts, fn(string $s): bool => $s !== ''));
    }
}

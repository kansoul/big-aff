<?php

namespace App\Enums;

/**
 * Permission slugs stored in `role_permissions.permission` (many rows per role — no fixed count limit).
 * Route middleware `permission.scope:` uses pipe-separated slugs (same as case values).
 */
enum Permission: string
{
    // —— Report ——
    case ReportOverviewView = 'report.overview.view';

    case ReportExport = 'report.export';

    // —— Settings → Users ——
    case SettingsUsersView = 'settings.users.view';

    case SettingsUsersCreate = 'settings.users.create';

    case SettingsUsersUpdate = 'settings.users.update';

    case SettingsUsersDelete = 'settings.users.delete';

    // —— Settings → Roles ——
    case SettingsRolesView = 'settings.roles.view';

    case SettingsRolesCreate = 'settings.roles.create';

    case SettingsRolesUpdate = 'settings.roles.update';

    case SettingsRolesDelete = 'settings.roles.delete';

    case SettingsRolesAssign = 'settings.roles.assign';

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn (self $p) => $p->value, self::cases());
    }

    /**
     * Role has every defined permission (equivalent to former “full mask”).
     *
     * @param  list<string>  $rolePermissionStrings
     */
    public static function hasFullAccessCollection(array $rolePermissionStrings): bool
    {
        if ($rolePermissionStrings === []) {
            return false;
        }

        $set = array_fill_keys($rolePermissionStrings, true);

        foreach (self::cases() as $case) {
            if (! isset($set[$case->value])) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  list<string>  $rolePermissionStrings
     */
    public static function collectionHasPermission(array $rolePermissionStrings, self $permission): bool
    {
        if (self::hasFullAccessCollection($rolePermissionStrings)) {
            return true;
        }

        return in_array($permission->value, $rolePermissionStrings, true);
    }

    /**
     * Route middleware: pipe-separated permission slugs (each must match a case value).
     */
    public static function collectionAllowsAnyOf(array $rolePermissionStrings, string $pipeSeparated): bool
    {
        foreach (self::parseRoutePermissionTokens($pipeSeparated) as $token) {
            $perm = self::tryFrom($token);
            if ($perm !== null && self::collectionHasPermission($rolePermissionStrings, $perm)) {
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

        return array_values(array_filter($parts, fn (string $s): bool => $s !== ''));
    }
}

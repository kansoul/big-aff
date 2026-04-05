<?php

namespace App\Enums;

/**
 * Bitwise permissions stored as a decimal string on `roles.permissions`.
 *
 * Bit position = declaration order. NEVER reorder existing cases; always append new ones.
 * Route middleware `permission.scope:` uses pipe-separated slugs (same as case values).
 */
enum Permission: string
{
    // —— Report ——
    case ReportOverviewView = 'report.overview.view';       // bit 0  →  1

    case ReportExport = 'report.export';                     // bit 1  →  2

        // —— Settings → Users ——
    case SettingsUsersView = 'settings.users.view';          // bit 2  →  4

    case SettingsUsersCreate = 'settings.users.create';      // bit 3  →  8

    case SettingsUsersUpdate = 'settings.users.update';      // bit 4  →  16

    case SettingsUsersDelete = 'settings.users.delete';      // bit 5  →  32

        // —— Settings → Roles ——
    case SettingsRolesView = 'settings.roles.view';          // bit 6  →  64

    case SettingsRolesCreate = 'settings.roles.create';      // bit 7  →  128

    case SettingsRolesUpdate = 'settings.roles.update';      // bit 8  →  256

    case SettingsRolesDelete = 'settings.roles.delete';      // bit 9  →  512

    case SettingsRolesAssign = 'settings.roles.assign';      // bit 10 →  1024

        // —— Settings → Sites ——
    case SettingsSitesView = 'settings.sites.view';          // bit 11 →  2048

    case SettingsSitesCreate = 'settings.sites.create';      // bit 12 →  4096

    case SettingsSitesUpdate = 'settings.sites.update';      // bit 13 →  8192

    case SettingsSitesDelete = 'settings.sites.delete';      // bit 14 →  16384

    case SettingsSitesAssign = 'settings.sites.assign';      // bit 15 →  32768

    /**
     * Bit value for this permission (1 << declaration index).
     */
    public function bit(): int
    {
        $index = array_search($this, self::cases(), true);

        return 1 << $index;
    }

    /**
     * Mask with every defined permission bit set.
     */
    public static function fullMask(): int
    {
        return (1 << count(self::cases())) - 1;
    }

    /**
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(static fn(self $p) => $p->value, self::cases());
    }

    /**
     * @param  list<string>  $slugs
     */
    public static function slugsToMask(array $slugs): string
    {
        $mask = 0;

        foreach ($slugs as $slug) {
            $perm = self::tryFrom($slug);
            if ($perm !== null) {
                $mask |= $perm->bit();
            }
        }

        return (string) $mask;
    }

    /**
     * @return list<string>
     */
    public static function maskToSlugs(string $mask): array
    {
        $maskInt = (int) $mask;
        $slugs = [];

        foreach (self::cases() as $case) {
            if (($maskInt & $case->bit()) === $case->bit()) {
                $slugs[] = $case->value;
            }
        }

        sort($slugs);

        return $slugs;
    }

    public static function hasFullAccess(string $mask): bool
    {
        return ((int) $mask & self::fullMask()) === self::fullMask();
    }

    public static function maskHasPermission(string $mask, self $permission): bool
    {
        if (self::hasFullAccess($mask)) {
            return true;
        }

        return ((int) $mask & $permission->bit()) === $permission->bit();
    }

    /**
     * Route middleware: pipe-separated permission slugs — returns true if the mask includes any of them.
     */
    public static function maskAllowsAnyOf(string $mask, string $pipeSeparated): bool
    {
        foreach (self::parseRoutePermissionTokens($pipeSeparated) as $token) {
            $perm = self::tryFrom($token);
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

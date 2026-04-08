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
    public const FULL_ACCESS_SENTINEL = '-1';

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

    // —— Ads Links ——
    case AdsLinksView = 'ads-links.view';                    // bit 16 →  65536

    case AdsLinksCreate = 'ads-links.create';                // bit 17 →  131072

    case AdsLinksUpdate = 'ads-links.update';                // bit 18 →  262144

    // —— Posts ——
    case PostsView = 'posts.view';                           // bit 19 →  524288

    case PostsCreate = 'posts.create';                       // bit 20 →  1048576

    case PostsUpdate = 'posts.update';                       // bit 21 →  2097152

    case PostsDelete = 'posts.delete';                       // bit 22 →  4194304

    // —— Files ——
    case FilesView = 'files.view';                           // bit 23 →  8388608

    case FilesCreate = 'files.create';                       // bit 24 →  16777216

    case FilesUpdate = 'files.update';                       // bit 25 →  33554432

    case FilesDelete = 'files.delete';                       // bit 26 →  67108864

    // —— Categories ——
    case CategoriesView = 'categories.view';                 // bit 27 →  134217728

    case CategoriesCreate = 'categories.create';             // bit 28 →  268435456

    case CategoriesUpdate = 'categories.update';             // bit 29 →  536870912

    case CategoriesDelete = 'categories.delete';             // bit 30 →  1073741824

    // —— Follows ——
    case FollowsView = 'follows.view';                       // bit 31 →  2147483648

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
        return ['*', self::FULL_ACCESS_SENTINEL, ...array_map(static fn (self $p) => $p->value, self::cases())];
    }

    /**
     * @param  list<string>  $slugs
     */
    public static function slugsToMask(array $slugs): string
    {
        if (in_array('*', $slugs, true)) {
            return self::FULL_ACCESS_SENTINEL;
        }

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
        if ($mask === self::FULL_ACCESS_SENTINEL) {
            return ['*'];
        }

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
        if ($mask === self::FULL_ACCESS_SENTINEL) {
            return true;
        }

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
     * Use "*" as a token to allow any mask with full access.
     */
    public static function maskAllowsAnyOf(string $mask, string $pipeSeparated): bool
    {
        $tokens = self::parseRoutePermissionTokens($pipeSeparated);

        if (in_array('*', $tokens, true) && self::hasFullAccess($mask)) {
            return true;
        }

        foreach ($tokens as $token) {
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

        return array_values(array_filter($parts, fn (string $s): bool => $s !== ''));
    }
}

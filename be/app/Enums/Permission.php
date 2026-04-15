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
    case FollowsDelete = 'follows.delete';                   // bit 32 →  4294967296

    // —— Styles ——
    case StylesView = 'styles.view';                         // bit 33 →  8589934592
    case StylesCreate = 'styles.create';                     // bit 34 →  17179869184
    case StylesDelete = 'styles.delete';                     // bit 35 →  34359738368

    // —— Channels ——
    case ChannelsView = 'channels.view';                     // bit 36 →  68719476736
    case ChannelsCreate = 'channels.create';                 // bit 37 →  137438953472
    case ChannelsDelete = 'channels.delete';                 // bit 38 →  274877906944

    // —— Keyword Sets ——
    case KeywordSetsView = 'keyword-sets.view';              // bit 39 →  549755813888
    case KeywordSetsCreate = 'keyword-sets.create';          // bit 40 →  1099511627776
    case KeywordSetsUpdate = 'keyword-sets.update';          // bit 41 →  2199023255552
    case KeywordSetsDelete = 'keyword-sets.delete';          // bit 42 →  4398046511104

    // —— Business Centers ——
    case BusinessCentersView = 'business-centers.view';      // bit 43 →  8796093022208

    case BusinessCentersCreate = 'business-centers.create';  // bit 44 →  17592186044416

    case BusinessCentersUpdate = 'business-centers.update';  // bit 45 →  35184372088832

    case BusinessCentersDelete = 'business-centers.delete';  // bit 46 →  70368744177664

    // —— Accounts ——
    case AccountsView = 'accounts.view';                     // bit 47 →  140737488355328

    case AccountsCreate = 'accounts.create';                 // bit 48 →  281474976710656

    case AccountsUpdate = 'accounts.update';                 // bit 49 →  562949953421312

    case AccountsDelete = 'accounts.delete';                 // bit 50 →  1125899906842624

    // —— Teams ——
    case TeamsView = 'teams.view';                           // bit 51 →  2251799813685248

    case TeamsCreate = 'teams.create';                       // bit 52 →  4503599627370496

    case TeamsUpdate = 'teams.update';                       // bit 53 →  9007199254740992

    case TeamsDelete = 'teams.delete';                       // bit 54 →  18014398509481984

    case TeamsAssign = 'teams.assign';                       // bit 55 →  36028797018963968

    // —— Accounts (assign) ——
    case AccountsAssign = 'accounts.assign';                 // bit 56 →  72057594037927936

    // —— Ad Clients ——
    case AdClientsView = 'ad-clients.view';                  // bit 57 →  144115188075855872

    case AdClientsCreate = 'ad-clients.create';              // bit 58 →  288230376151711744

    case AdClientsUpdate = 'ad-clients.update';              // bit 59 →  576460752303423488

    case AdClientsDelete = 'ad-clients.delete';              // bit 60 →  1152921504606846976

    // —— Campaign Rule Settings ——
    case CampaignRuleSettingsView = 'campaign-rule-settings.view';    // bit 61 →  2305843009213693952

    case CampaignRuleSettingsUpdate = 'campaign-rule-settings.update'; // bit 62 →  4611686018427387904

    // —— Google Conversions ——
    case GoogleConversionsView = 'google-conversions.view';    // bit 63 →  9223372036854775808

    case GoogleConversionsUpdate = 'google-conversions.update'; // bit 64 →  18446744073709551616

    case GoogleConversionsCreate = 'google-conversions.create'; // bit 65 →  36893488147419103232

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

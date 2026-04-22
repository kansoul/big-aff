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

    // —— Settings → Users ——
    case SettingsUsersView = 'settings.users.view';          // bit 0  →  1
    case SettingsUsersCreate = 'settings.users.create';      // bit 1  →  2
    case SettingsUsersUpdate = 'settings.users.update';      // bit 2  →  4
    case SettingsUsersDelete = 'settings.users.delete';      // bit 3  →  8

    // —— Settings → Roles ——
    case SettingsRolesView = 'settings.roles.view';          // bit 4  →  16
    case SettingsRolesCreate = 'settings.roles.create';      // bit 5  →  32
    case SettingsRolesUpdate = 'settings.roles.update';      // bit 6  →  64
    case SettingsRolesDelete = 'settings.roles.delete';      // bit 7  →  128
    case SettingsRolesAssign = 'settings.roles.assign';      // bit 8  →  256

    // —— Settings → Sites ——
    case SettingsSitesView = 'settings.sites.view';          // bit 9  →  512
    case SettingsSitesCreate = 'settings.sites.create';      // bit 10 →  1024
    case SettingsSitesUpdate = 'settings.sites.update';      // bit 11 →  2048
    case SettingsSitesDelete = 'settings.sites.delete';      // bit 12 →  4096
    case SettingsSitesAssign = 'settings.sites.assign';      // bit 13 →  8192

    // —— Posts ——
    case PostsView = 'posts.view';                           // bit 14 →  16384
    case PostsCreate = 'posts.create';                       // bit 15 →  32768
    case PostsUpdate = 'posts.update';                       // bit 16 →  65536
    case PostsDelete = 'posts.delete';                       // bit 17 →  131072
    case PostsPublish = 'posts.publish';                     // bit 18 →  262144

    // —— Categories ——
    case CategoriesView = 'categories.view';                 // bit 19 →  524288
    case CategoriesCreate = 'categories.create';             // bit 20 →  1048576
    case CategoriesUpdate = 'categories.update';             // bit 21 →  2097152
    case CategoriesDelete = 'categories.delete';             // bit 22 →  4194304

    // —— Styles ——
    case StylesView = 'styles.view';                         // bit 23 →  8388608
    case StylesCreate = 'styles.create';                     // bit 24 →  16777216
    case StylesDelete = 'styles.delete';                     // bit 25 →  33554432

    // —— Channels ——
    case ChannelsView = 'channels.view';                     // bit 26 →  67108864
    case ChannelsCreate = 'channels.create';                 // bit 27 →  134217728
    case ChannelsDelete = 'channels.delete';                 // bit 28 →  268435456

    // —— Follows ——
    case FollowsView = 'follows.view';                       // bit 29 →  536870912
    case FollowsDelete = 'follows.delete';                   // bit 30 →  1073741824

    // —— Ads Links ——
    case AdsLinksView = 'ads-links.view';                    // bit 31 →  2147483648
    case AdsLinksCreate = 'ads-links.create';                // bit 32 →  4294967296
    case AdsLinksUpdate = 'ads-links.update';                // bit 33 →  8589934592

    // —— Keyword Sets ——
    case KeywordSetsView = 'keyword-sets.view';              // bit 34 →  17179869184
    case KeywordSetsCreate = 'keyword-sets.create';          // bit 35 →  34359738368
    case KeywordSetsUpdate = 'keyword-sets.update';          // bit 36 →  68719476736
    case KeywordSetsDelete = 'keyword-sets.delete';          // bit 37 →  137438953472

    // —— Business Centers ——
    case BusinessCentersView = 'business-centers.view';      // bit 38 →  274877906944
    case BusinessCentersCreate = 'business-centers.create';  // bit 39 →  549755813888
    case BusinessCentersUpdate = 'business-centers.update';  // bit 40 →  1099511627776
    case BusinessCentersDelete = 'business-centers.delete';  // bit 41 →  2199023255552

    // —— Accounts ——
    case AccountsView = 'accounts.view';                     // bit 42 →  4398046511104
    case AccountsCreate = 'accounts.create';                 // bit 43 →  8796093022208
    case AccountsUpdate = 'accounts.update';                 // bit 44 →  17592186044416
    case AccountsDelete = 'accounts.delete';                 // bit 45 →  35184372088832
    case AccountsAssign = 'accounts.assign';                 // bit 46 →  70368744177664

    // —— Teams ——
    case TeamsView = 'teams.view';                           // bit 47 →  140737488355328
    case TeamsCreate = 'teams.create';                       // bit 48 →  281474976710656
    case TeamsUpdate = 'teams.update';                       // bit 49 →  562949953421312
    case TeamsDelete = 'teams.delete';                       // bit 50 →  1125899906842624
    case TeamsAssign = 'teams.assign';                       // bit 51 →  2251799813685248

    // —— Ad Clients ——
    case AdClientsView = 'ad-clients.view';                  // bit 52 →  4503599627370496
    case AdClientsCreate = 'ad-clients.create';              // bit 53 →  9007199254740992
    case AdClientsUpdate = 'ad-clients.update';              // bit 54 →  18014398509481984
    case AdClientsDelete = 'ad-clients.delete';              // bit 55 →  36028797018963968

    // —— Campaigns ——
    case CampaignsView = 'campaigns.view';                   // bit 56 →  72057594037927936

    // —— Campaign Rules ——
    case CampaignRulesView = 'campaign-rules.view';          // bit 57 →  144115188075855872
    case CampaignRulesCreate = 'campaign-rules.create';      // bit 58 →  288230376151711744
    case CampaignRulesUpdate = 'campaign-rules.update';      // bit 59 →  576460752303423488
    case CampaignRulesDelete = 'campaign-rules.delete';      // bit 60 →  1152921504606846976

    // —— Campaign Rule Settings ——
    case CampaignRuleSettingsView = 'campaign-rule-settings.view';    // bit 61 →  2305843009213693952
    case CampaignRuleSettingsUpdate = 'campaign-rule-settings.update'; // bit 62 →  4611686018427387904

    // —— Campaign Schedules ——
    case CampaignSchedulesView = 'campaign-schedules.view';    // bit 63 →  9223372036854775808
    case CampaignSchedulesCreate = 'campaign-schedules.create'; // bit 64 →  18446744073709551616
    case CampaignSchedulesUpdate = 'campaign-schedules.update'; // bit 65 →  36893488147419103232
    case CampaignSchedulesDelete = 'campaign-schedules.delete'; // bit 66 →  73786976294838206464

    // —— Ads Report ——
    case AdsReportView = 'ads-report.view';                    // bit 67 →  147573952589676412928

    // —— Revenue Reports ——
    case RevenueReportsView = 'revenue-reports.view';          // bit 68 →  295147905179352825856

    // —— Revenue Stats ——
    case RevenueStatsView = 'revenue-stats.view';              // bit 69 →  590295810358705651712

    // —— Revenue Chart Reports ——
    case RevenueChartReportsView = 'revenue-chart-reports.view'; // bit 70 →  1180591620717411303424

    // —— Campaign Reports ——
    case CampaignReportsView = 'campaign-reports.view';        // bit 71 →  2361183241434822606848

    // —— Analytics Tracking ——
    case AnalyticsTrackingView = 'analytics-tracking.view';    // bit 72 →  4722366482869645213696

    // —— Inactive Styles ——
    case InactiveStylesView = 'inactive-styles.view';          // bit 73 →  9444732965739290427392
    case InactiveStylesDelete = 'inactive-styles.delete';      // bit 74 →  18889465931478580854784

    // —— Style Report Range ——
    case StyleReportRangeView = 'style-report-range.view';     // bit 75 →  37778931862957161709568

    // —— Google Conversions ——
    case GoogleConversionsView = 'google-conversions.view';    // bit 76 →  75557863725914323419136
    case GoogleConversionsCreate = 'google-conversions.create'; // bit 77 →  151115727451828646838272
    case GoogleConversionsUpdate = 'google-conversions.update'; // bit 78 →  302231454903657293676544

    // —— User Table Preferences ——
    case UserTablePreferencesView = 'user-table-preferences.view';     // bit 79 →  604462909807314587353088
    case UserTablePreferencesUpdate = 'user-table-preferences.update'; // bit 80 →  1208925819615629174706176

    // —— Logs ——
    case LogsView = 'logs.view';                               // bit 81 →  2417851639231258349412352

    // —— Files ——
    case FilesView = 'files.view';                             // bit 82 →  4835703278458516698824704

    /**
     * Bit value for this permission as a decimal string (2^index).
     * Uses GMP to support arbitrarily large bit positions.
     */
    public function bit(): string
    {
        $index = array_search($this, self::cases(), true);

        return gmp_strval(gmp_pow(2, $index));
    }

    /**
     * Mask with every defined permission bit set, as a decimal string.
     */
    public static function fullMask(): string
    {
        return gmp_strval(gmp_sub(gmp_pow(2, count(self::cases())), 1));
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

        $mask = gmp_init(0);

        foreach ($slugs as $slug) {
            $perm = self::tryFrom($slug);
            if ($perm !== null) {
                $mask = gmp_or($mask, gmp_init($perm->bit()));
            }
        }

        return gmp_strval($mask);
    }

    /**
     * @return list<string>
     */
    public static function maskToSlugs(string $mask): array
    {
        if ($mask === self::FULL_ACCESS_SENTINEL) {
            return ['*'];
        }

        $maskGmp = gmp_init($mask);
        $slugs = [];

        foreach (self::cases() as $case) {
            $bit = gmp_init($case->bit());
            if (gmp_cmp(gmp_and($maskGmp, $bit), $bit) === 0) {
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

        $fullMask = gmp_init(self::fullMask());
        $maskGmp = gmp_init($mask);

        return gmp_cmp(gmp_and($maskGmp, $fullMask), $fullMask) === 0;
    }

    public static function maskHasPermission(string $mask, self $permission): bool
    {
        if (self::hasFullAccess($mask)) {
            return true;
        }

        $bit = gmp_init($permission->bit());
        $maskGmp = gmp_init($mask);

        return gmp_cmp(gmp_and($maskGmp, $bit), $bit) === 0;
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

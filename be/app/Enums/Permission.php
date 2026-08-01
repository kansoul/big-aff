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

    // —— Settings → Sites ——
    case SettingsSitesView = 'settings.sites.view';
    case SettingsSitesCreate = 'settings.sites.create';
    case SettingsSitesUpdate = 'settings.sites.update';
    case SettingsSitesDelete = 'settings.sites.delete';
    case SettingsSitesAssign = 'settings.sites.assign';

    // —— Follows ——
    case FollowsView = 'follows.view';
    case FollowsDelete = 'follows.delete';

    // —— Ads Links ——
    case AdsLinksView = 'ads-links.view';
    case AdsLinksCreate = 'ads-links.create';
    case AdsLinksUpdate = 'ads-links.update';

    // —— Keyword Sets ——
    case KeywordSetsView = 'keyword-sets.view';
    case KeywordSetsCreate = 'keyword-sets.create';
    case KeywordSetsUpdate = 'keyword-sets.update';
    case KeywordSetsDelete = 'keyword-sets.delete';

    // —— Business Centers ——
    case BusinessCentersView = 'business-centers.view';
    case BusinessCentersCreate = 'business-centers.create';
    case BusinessCentersUpdate = 'business-centers.update';
    case BusinessCentersDelete = 'business-centers.delete';

    // —— Accounts ——
    case AccountsView = 'accounts.view';
    case AccountsCreate = 'accounts.create';
    case AccountsUpdate = 'accounts.update';
    case AccountsDelete = 'accounts.delete';
    case AccountsAssign = 'accounts.assign';

    // —— Teams ——
    case TeamsView = 'teams.view';
    case TeamsCreate = 'teams.create';
    case TeamsUpdate = 'teams.update';
    case TeamsDelete = 'teams.delete';
    case TeamsAssign = 'teams.assign';

    // —— Campaigns ——
    case CampaignsView = 'campaigns.view';

    // —— Campaign Rules ——
    case CampaignRulesView = 'campaign-rules.view';
    case CampaignRulesCreate = 'campaign-rules.create';
    case CampaignRulesUpdate = 'campaign-rules.update';
    case CampaignRulesDelete = 'campaign-rules.delete';

    // —— Campaign Rule Settings ——
    case CampaignRuleSettingsView = 'campaign-rule-settings.view';
    case CampaignRuleSettingsUpdate = 'campaign-rule-settings.update';

    // —— Campaign Schedules ——
    case CampaignSchedulesView = 'campaign-schedules.view';
    case CampaignSchedulesCreate = 'campaign-schedules.create';
    case CampaignSchedulesUpdate = 'campaign-schedules.update';
    case CampaignSchedulesDelete = 'campaign-schedules.delete';

    // —— Ads Report ——
    case AdsReportView = 'ads-report.view';

    // —— Revenue Reports ——
    case RevenueReportsView = 'revenue-reports.view';

    // —— Revenue Stats ——
    case RevenueStatsView = 'revenue-stats.view';

    // —— Revenue Chart Reports ——
    case RevenueChartReportsView = 'revenue-chart-reports.view';

    // —— Campaign Reports ——
    case CampaignReportsView = 'campaign-reports.view';

    // —— Analytics Tracking ——
    case AnalyticsTrackingView = 'analytics-tracking.view';

    // —— Revenue Report Range ——
    case RevenueReportRangeView = 'revenue-report-range.view';

    // —— Google Conversions ——
    case GoogleConversionsView = 'google-conversions.view';
    case GoogleConversionsCreate = 'google-conversions.create';
    case GoogleConversionsUpdate = 'google-conversions.update';

    // —— User Table Preferences ——
    case UserTablePreferencesView = 'user-table-preferences.view';
    case UserTablePreferencesUpdate = 'user-table-preferences.update';

    // —— Logs ——
    case LogsView = 'logs.view';

    // —— Files ——
    case FilesView = 'files.view';

    // —— Delivery Entities Reports ——
    case DeliveryEntitiesReportsView = 'delivery-entities-reports.view';
    case DeliveryEntitiesReportsUpdate = 'delivery-entities-reports.update';

    // Dashboard
    case DashboardStatView = 'dashboard.stats.view';

    // —— Revenue Report Range ——
    case DashboardTeamView = 'dashboard.teams.view';

    // —— Revenue Report Range ——
    case DashboardUserView = 'dashboard.users.view';

    // —— Gtags ——
    case GtagsView = 'gtags.view';
    case GtagsCreate = 'gtags.create';
    case GtagsUpdate = 'gtags.update';

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

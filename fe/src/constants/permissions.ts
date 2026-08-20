/**
 * Permission slugs mirror `App\Enums\Permission` (Laravel). Roles store permissions as a bitwise
 * mask string on `roles.permissions`. API exposes `permissions: string[]` (decoded slugs) on user and role resources.
 */

export const PermissionSlugs = {
  FullAccess: '*',

  // Settings
  SettingsUsersView: 'settings.users.view',
  SettingsUsersCreate: 'settings.users.create',
  SettingsUsersUpdate: 'settings.users.update',
  SettingsUsersDelete: 'settings.users.delete',
  SettingsRolesView: 'settings.roles.view',
  SettingsRolesCreate: 'settings.roles.create',
  SettingsRolesUpdate: 'settings.roles.update',
  SettingsRolesDelete: 'settings.roles.delete',
  SettingsRolesAssign: 'settings.roles.assign',
  // Links
  LinksView: 'links.view',
  LinksCreate: 'links.create',
  LinksUpdate: 'links.update',
  LinksDelete: 'links.delete',

  // Keyword Sets
  KeywordSetsView: 'keyword-sets.view',
  KeywordSetsCreate: 'keyword-sets.create',
  KeywordSetsUpdate: 'keyword-sets.update',
  KeywordSetsDelete: 'keyword-sets.delete',

  // Business Centers
  BusinessCentersView: 'business-centers.view',
  BusinessCentersCreate: 'business-centers.create',
  BusinessCentersUpdate: 'business-centers.update',
  BusinessCentersDelete: 'business-centers.delete',

  // Accounts
  AccountsView: 'accounts.view',
  AccountsCreate: 'accounts.create',
  AccountsUpdate: 'accounts.update',
  AccountsDelete: 'accounts.delete',
  AccountsAssign: 'accounts.assign',

  // Teams
  TeamsView: 'teams.view',
  TeamsCreate: 'teams.create',
  TeamsUpdate: 'teams.update',
  TeamsDelete: 'teams.delete',
  TeamsAssign: 'teams.assign',

  // Campaigns
  CampaignsView: 'campaigns.view',

  // Campaign Rules
  CampaignRulesView: 'campaign-rules.view',
  CampaignRulesCreate: 'campaign-rules.create',
  CampaignRulesUpdate: 'campaign-rules.update',
  CampaignRulesDelete: 'campaign-rules.delete',

  // Campaign Rule Settings
  CampaignRuleSettingsView: 'campaign-rule-settings.view',
  CampaignRuleSettingsUpdate: 'campaign-rule-settings.update',

  // Campaign Schedules
  CampaignSchedulesView: 'campaign-schedules.view',
  CampaignSchedulesCreate: 'campaign-schedules.create',
  CampaignSchedulesUpdate: 'campaign-schedules.update',
  CampaignSchedulesDelete: 'campaign-schedules.delete',

  // Reports & Analytics
  AdsReportView: 'ads-report.view',
  RevenueReportsView: 'revenue-reports.view',
  RevenueStatsView: 'revenue-stats.view',
  RevenueChartReportsView: 'revenue-chart-reports.view',
  CampaignReportsView: 'campaign-reports.view',
  DeliveryEntitiesReportsView: 'delivery-entities-reports.view',
  DeliveryEntitiesReportsUpdate: 'delivery-entities-reports.update',
  AnalyticsTrackingView: 'analytics-tracking.view',
  RevenueReportRangeView: 'revenue-report-range.view',

  // Google Conversions
  GoogleConversionsView: 'google-conversions.view',
  GoogleConversionsCreate: 'google-conversions.create',
  GoogleConversionsUpdate: 'google-conversions.update',

  // Pixels
  PixelsView: 'pixels.view',
  PixelsCreate: 'pixels.create',
  PixelsUpdate: 'pixels.update',
  PixelsDelete: 'pixels.delete',

  // System
  UserTablePreferencesView: 'user-table-preferences.view',
  UserTablePreferencesUpdate: 'user-table-preferences.update',
  LogsView: 'logs.view',

  // Files
  FilesView: 'files.view',

  // Dashboard
  DashboardStatView: 'dashboard.stats.view',
  DashboardTeamView: 'dashboard.teams.view',
  DashboardUserView: 'dashboard.users.view',
} as const

export function allPermissionSlugs(): string[] {
  return Object.values(PermissionSlugs)
}

export function hasFullAccess(perms: string[]): boolean {
  if (perms.includes(PermissionSlugs.FullAccess)) {
    return true
  }
  const all = allPermissionSlugs()
  if (all.length === 0) {
    return false
  }
  const set = new Set(perms)
  return all.every((s) => set.has(s))
}

export function hasPermission(perms: string[] | null | undefined, slug: string): boolean {
  if (!perms?.length) {
    return false
  }
  if (hasFullAccess(perms)) {
    return true
  }
  return perms.includes(slug)
}

function catalogSlugsFlat(): string[] {
  return PERMISSION_CATALOG.flatMap((cluster) =>
    cluster.screens.flatMap((screen) => screen.permissions.map((p) => p.slug)),
  )
}

export function countActivePermissions(perms: string[]): number {
  if (hasFullAccess(perms)) {
    return catalogSlugsFlat().length
  }
  const set = new Set(perms)
  return catalogSlugsFlat().filter((s) => set.has(s)).length
}

export type PermissionDefinition = {
  key: keyof typeof PermissionSlugs
  slug: string
  label: string
}

export type PermissionCluster = {
  id: string
  label: string
  screens: {
    id: string
    label: string
    permissions: PermissionDefinition[]
  }[]
}

/** Role UI: groups/screens that exist in the app today (Settings → Roles). */
export const PERMISSION_CATALOG: PermissionCluster[] = [
  {
    id: 'settings',
    label: 'Settings',
    screens: [
      {
        id: 'users',
        label: 'Users',
        permissions: [
          { key: 'SettingsUsersView', slug: PermissionSlugs.SettingsUsersView, label: 'View' },
          {
            key: 'SettingsUsersCreate',
            slug: PermissionSlugs.SettingsUsersCreate,
            label: 'Create',
          },
          {
            key: 'SettingsUsersUpdate',
            slug: PermissionSlugs.SettingsUsersUpdate,
            label: 'Update',
          },
          {
            key: 'SettingsUsersDelete',
            slug: PermissionSlugs.SettingsUsersDelete,
            label: 'Delete',
          },
        ],
      },
      {
        id: 'roles',
        label: 'Roles',
        permissions: [
          { key: 'SettingsRolesView', slug: PermissionSlugs.SettingsRolesView, label: 'View' },
          {
            key: 'SettingsRolesCreate',
            slug: PermissionSlugs.SettingsRolesCreate,
            label: 'Create',
          },
          {
            key: 'SettingsRolesUpdate',
            slug: PermissionSlugs.SettingsRolesUpdate,
            label: 'Update',
          },
          {
            key: 'SettingsRolesDelete',
            slug: PermissionSlugs.SettingsRolesDelete,
            label: 'Delete',
          },
          {
            key: 'SettingsRolesAssign',
            slug: PermissionSlugs.SettingsRolesAssign,
            label: 'Assign permissions',
          },
        ],
      },
    ],
  },
  {
    id: 'links',
    label: 'Links',
    screens: [
      {
        id: 'links',
        label: 'Links',
        permissions: [
          { key: 'LinksView', slug: PermissionSlugs.LinksView, label: 'View' },
          { key: 'LinksCreate', slug: PermissionSlugs.LinksCreate, label: 'Create' },
          { key: 'LinksUpdate', slug: PermissionSlugs.LinksUpdate, label: 'Update' },
          { key: 'LinksDelete', slug: PermissionSlugs.LinksDelete, label: 'Delete' },
        ],
      },
    ],
  },
  {
    id: 'keyword-sets',
    label: 'Keyword Sets',
    screens: [
      {
        id: 'keyword-sets',
        label: 'Keyword Sets',
        permissions: [
          { key: 'KeywordSetsView', slug: PermissionSlugs.KeywordSetsView, label: 'View' },
          { key: 'KeywordSetsCreate', slug: PermissionSlugs.KeywordSetsCreate, label: 'Create' },
          { key: 'KeywordSetsUpdate', slug: PermissionSlugs.KeywordSetsUpdate, label: 'Update' },
          { key: 'KeywordSetsDelete', slug: PermissionSlugs.KeywordSetsDelete, label: 'Delete' },
        ],
      },
    ],
  },
  {
    id: 'business-centers',
    label: 'Business Centers',
    screens: [
      {
        id: 'business-centers',
        label: 'Business Centers',
        permissions: [
          { key: 'BusinessCentersView', slug: PermissionSlugs.BusinessCentersView, label: 'View' },
          {
            key: 'BusinessCentersCreate',
            slug: PermissionSlugs.BusinessCentersCreate,
            label: 'Create',
          },
          {
            key: 'BusinessCentersUpdate',
            slug: PermissionSlugs.BusinessCentersUpdate,
            label: 'Update',
          },
          {
            key: 'BusinessCentersDelete',
            slug: PermissionSlugs.BusinessCentersDelete,
            label: 'Delete',
          },
        ],
      },
    ],
  },
  {
    id: 'accounts',
    label: 'Accounts',
    screens: [
      {
        id: 'accounts',
        label: 'Accounts',
        permissions: [
          { key: 'AccountsView', slug: PermissionSlugs.AccountsView, label: 'View' },
          { key: 'AccountsCreate', slug: PermissionSlugs.AccountsCreate, label: 'Create' },
          { key: 'AccountsUpdate', slug: PermissionSlugs.AccountsUpdate, label: 'Update' },
          { key: 'AccountsDelete', slug: PermissionSlugs.AccountsDelete, label: 'Delete' },
          { key: 'AccountsAssign', slug: PermissionSlugs.AccountsAssign, label: 'Assign users' },
        ],
      },
    ],
  },
  {
    id: 'teams',
    label: 'Teams',
    screens: [
      {
        id: 'teams',
        label: 'Teams',
        permissions: [
          { key: 'TeamsView', slug: PermissionSlugs.TeamsView, label: 'View' },
          { key: 'TeamsCreate', slug: PermissionSlugs.TeamsCreate, label: 'Create' },
          { key: 'TeamsUpdate', slug: PermissionSlugs.TeamsUpdate, label: 'Update' },
          { key: 'TeamsDelete', slug: PermissionSlugs.TeamsDelete, label: 'Delete' },
          { key: 'TeamsAssign', slug: PermissionSlugs.TeamsAssign, label: 'Assign users' },
        ],
      },
    ],
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    screens: [
      {
        id: 'campaigns',
        label: 'Campaigns',
        permissions: [{ key: 'CampaignsView', slug: PermissionSlugs.CampaignsView, label: 'View' }],
      },
      {
        id: 'campaign-rules',
        label: 'Campaign Rules',
        permissions: [
          { key: 'CampaignRulesView', slug: PermissionSlugs.CampaignRulesView, label: 'View' },
          {
            key: 'CampaignRulesCreate',
            slug: PermissionSlugs.CampaignRulesCreate,
            label: 'Create',
          },
          {
            key: 'CampaignRulesUpdate',
            slug: PermissionSlugs.CampaignRulesUpdate,
            label: 'Update',
          },
          {
            key: 'CampaignRulesDelete',
            slug: PermissionSlugs.CampaignRulesDelete,
            label: 'Delete',
          },
        ],
      },
      {
        id: 'campaign-rule-settings',
        label: 'Campaign Rule Settings',
        permissions: [
          {
            key: 'CampaignRuleSettingsView',
            slug: PermissionSlugs.CampaignRuleSettingsView,
            label: 'View',
          },
          {
            key: 'CampaignRuleSettingsUpdate',
            slug: PermissionSlugs.CampaignRuleSettingsUpdate,
            label: 'Update',
          },
        ],
      },
      {
        id: 'campaign-schedules',
        label: 'Campaign Schedules',
        permissions: [
          {
            key: 'CampaignSchedulesView',
            slug: PermissionSlugs.CampaignSchedulesView,
            label: 'View',
          },
          {
            key: 'CampaignSchedulesCreate',
            slug: PermissionSlugs.CampaignSchedulesCreate,
            label: 'Create',
          },
          {
            key: 'CampaignSchedulesUpdate',
            slug: PermissionSlugs.CampaignSchedulesUpdate,
            label: 'Update',
          },
          {
            key: 'CampaignSchedulesDelete',
            slug: PermissionSlugs.CampaignSchedulesDelete,
            label: 'Delete',
          },
        ],
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    screens: [
      {
        id: 'ads-report',
        label: 'Spend Report',
        permissions: [{ key: 'AdsReportView', slug: PermissionSlugs.AdsReportView, label: 'View' }],
      },
      {
        id: 'revenue-reports',
        label: 'Revenue Report',
        permissions: [
          { key: 'RevenueReportsView', slug: PermissionSlugs.RevenueReportsView, label: 'View' },
        ],
      },
      {
        id: 'revenue-stats',
        label: 'Team Report',
        permissions: [
          { key: 'RevenueStatsView', slug: PermissionSlugs.RevenueStatsView, label: 'View' },
        ],
      },
      {
        id: 'campaign-reports',
        label: 'Campaign Reports',
        permissions: [
          {
            key: 'CampaignReportsView',
            slug: PermissionSlugs.CampaignReportsView,
            label: 'Campaign Reports View',
          },
          {
            key: 'DeliveryEntitiesReportsView',
            slug: PermissionSlugs.DeliveryEntitiesReportsView,
            label: 'View Ads/Adset Report',
          },
          {
            key: 'DeliveryEntitiesReportsUpdate',
            slug: PermissionSlugs.DeliveryEntitiesReportsUpdate,
            label: 'Toggle Ads/Adset Status',
          },
          {
            key: 'RevenueReportRangeView',
            slug: PermissionSlugs.RevenueReportRangeView,
            label: 'Revenue Range View',
          },
          {
            key: 'AnalyticsTrackingView',
            slug: PermissionSlugs.AnalyticsTrackingView,
            label: 'Analytics Tracking View',
          },
          {
            key: 'RevenueChartReportsView',
            slug: PermissionSlugs.RevenueChartReportsView,
            label: 'Revenue Chart View',
          },
        ],
      },
    ],
  },
  {
    id: 'dashboard-report',
    label: 'Dashboard Report',
    screens: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        permissions: [
          {
            key: 'DashboardStatView',
            slug: PermissionSlugs.DashboardStatView,
            label: 'Stats View',
          },
          { key: 'DashboardTeamView', slug: PermissionSlugs.DashboardTeamView, label: 'Team View' },
          { key: 'DashboardUserView', slug: PermissionSlugs.DashboardUserView, label: 'User View' },
        ],
      },
    ],
  },
  {
    id: 'google-conversions',
    label: 'Google Conversions',
    screens: [
      {
        id: 'google-conversions',
        label: 'Google Conversions',
        permissions: [
          {
            key: 'GoogleConversionsView',
            slug: PermissionSlugs.GoogleConversionsView,
            label: 'View',
          },
          {
            key: 'GoogleConversionsCreate',
            slug: PermissionSlugs.GoogleConversionsCreate,
            label: 'Create',
          },
          {
            key: 'GoogleConversionsUpdate',
            slug: PermissionSlugs.GoogleConversionsUpdate,
            label: 'Update',
          },
        ],
      },
    ],
  },
  {
    id: 'pixels',
    label: 'Pixel Conversions',
    screens: [
      {
        id: 'pixels',
        label: 'Pixel Conversions',
        permissions: [
          { key: 'PixelsView', slug: PermissionSlugs.PixelsView, label: 'View' },
          { key: 'PixelsCreate', slug: PermissionSlugs.PixelsCreate, label: 'Create' },
          { key: 'PixelsUpdate', slug: PermissionSlugs.PixelsUpdate, label: 'Update' },
          { key: 'PixelsDelete', slug: PermissionSlugs.PixelsDelete, label: 'Delete' },
        ],
      },
    ],
  },
  {
    id: 'files',
    label: 'Files',
    screens: [
      {
        id: 'files',
        label: 'Files',
        permissions: [{ key: 'FilesView', slug: PermissionSlugs.FilesView, label: 'View' }],
      },
    ],
  },
  {
    id: 'system',
    label: 'System',
    screens: [
      {
        id: 'user-table-preferences',
        label: 'Table Preferences',
        permissions: [
          {
            key: 'UserTablePreferencesView',
            slug: PermissionSlugs.UserTablePreferencesView,
            label: 'View',
          },
          {
            key: 'UserTablePreferencesUpdate',
            slug: PermissionSlugs.UserTablePreferencesUpdate,
            label: 'Update',
          },
        ],
      },
      {
        id: 'logs',
        label: 'Logs',
        permissions: [{ key: 'LogsView', slug: PermissionSlugs.LogsView, label: 'View' }],
      },
    ],
  },
]

/**
 * Permission slugs mirror `App\Enums\Permission` (Laravel). Roles store permissions as a bitwise
 * mask string on `roles.permissions`. API exposes `permissions: string[]` (decoded slugs) on user and role resources.
 */

export const PermissionSlugs = {
  FullAccess: '*',
  ReportOverviewView: 'report.overview.view',
  ReportExport: 'report.export',
  SettingsUsersView: 'settings.users.view',
  SettingsUsersCreate: 'settings.users.create',
  SettingsUsersUpdate: 'settings.users.update',
  SettingsUsersDelete: 'settings.users.delete',
  SettingsRolesView: 'settings.roles.view',
  SettingsRolesCreate: 'settings.roles.create',
  SettingsRolesUpdate: 'settings.roles.update',
  SettingsRolesDelete: 'settings.roles.delete',
  SettingsRolesAssign: 'settings.roles.assign',
  SettingsSitesView: 'settings.sites.view',
  SettingsSitesCreate: 'settings.sites.create',
  SettingsSitesUpdate: 'settings.sites.update',
  SettingsSitesDelete: 'settings.sites.delete',
  SettingsSitesAssign: 'settings.sites.assign',
  AdsLinksView: 'ads-links.view',
  AdsLinksCreate: 'ads-links.create',
  AdsLinksUpdate: 'ads-links.update',
  PostsView: 'posts.view',
  PostsCreate: 'posts.create',
  PostsUpdate: 'posts.update',
  PostsDelete: 'posts.delete',
  FilesView: 'files.view',
  FilesCreate: 'files.create',
  FilesUpdate: 'files.update',
  FilesDelete: 'files.delete',
  CategoriesView: 'categories.view',
  CategoriesCreate: 'categories.create',
  CategoriesUpdate: 'categories.update',
  CategoriesDelete: 'categories.delete',
  StylesView: 'styles.view',
  StylesCreate: 'styles.create',
  StylesDelete: 'styles.delete',
  ChannelsView: 'channels.view',
  ChannelsCreate: 'channels.create',
  ChannelsDelete: 'channels.delete',
  FollowsView: 'follows.view',
  FollowsDelete: 'follows.delete',
  KeywordSetsView: 'keyword-sets.view',
  KeywordSetsCreate: 'keyword-sets.create',
  KeywordSetsUpdate: 'keyword-sets.update',
  KeywordSetsDelete: 'keyword-sets.delete',
  BusinessCentersView: 'business-centers.view',
  BusinessCentersCreate: 'business-centers.create',
  BusinessCentersUpdate: 'business-centers.update',
  BusinessCentersDelete: 'business-centers.delete',
  AccountsView: 'accounts.view',
  AccountsCreate: 'accounts.create',
  AccountsUpdate: 'accounts.update',
  AccountsDelete: 'accounts.delete',
  TeamsView: 'teams.view',
  TeamsCreate: 'teams.create',
  TeamsUpdate: 'teams.update',
  TeamsDelete: 'teams.delete',
  TeamsAssign: 'teams.assign',
  AccountsAssign: 'accounts.assign',
  AdClientsView: 'ad-clients.view',
  AdClientsCreate: 'ad-clients.create',
  AdClientsUpdate: 'ad-clients.update',
  AdClientsDelete: 'ad-clients.delete',
  CampaignRuleSettingsView: 'campaign-rule-settings.view',
  CampaignRuleSettingsUpdate: 'campaign-rule-settings.update',
  GoogleConversionsView: 'google-conversions.view',
  GoogleConversionsUpdate: 'google-conversions.update',
  GoogleConversionsCreate: 'google-conversions.create',
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
          {
            key: 'SettingsUsersView',
            slug: PermissionSlugs.SettingsUsersView,
            label: 'View',
          },
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
          {
            key: 'SettingsRolesView',
            slug: PermissionSlugs.SettingsRolesView,
            label: 'View',
          },
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
      {
        id: 'sites',
        label: 'Sites',
        permissions: [
          {
            key: 'SettingsSitesView',
            slug: PermissionSlugs.SettingsSitesView,
            label: 'View',
          },
          {
            key: 'SettingsSitesCreate',
            slug: PermissionSlugs.SettingsSitesCreate,
            label: 'Create',
          },
          {
            key: 'SettingsSitesUpdate',
            slug: PermissionSlugs.SettingsSitesUpdate,
            label: 'Update',
          },
          {
            key: 'SettingsSitesDelete',
            slug: PermissionSlugs.SettingsSitesDelete,
            label: 'Delete',
          },
          {
            key: 'SettingsSitesAssign',
            slug: PermissionSlugs.SettingsSitesAssign,
            label: 'Assign users',
          },
        ],
      },
    ],
  },
  {
    id: 'ads-links',
    label: 'Ads Links',
    screens: [
      {
        id: 'ads-links',
        label: 'Ads Links',
        permissions: [
          {
            key: 'AdsLinksView',
            slug: PermissionSlugs.AdsLinksView,
            label: 'View',
          },
          {
            key: 'AdsLinksCreate',
            slug: PermissionSlugs.AdsLinksCreate,
            label: 'Create',
          },
          {
            key: 'AdsLinksUpdate',
            slug: PermissionSlugs.AdsLinksUpdate,
            label: 'Update',
          },
        ],
      },
    ],
  },
  {
    id: 'posts',
    label: 'Posts',
    screens: [
      {
        id: 'posts',
        label: 'Posts',
        permissions: [
          {
            key: 'PostsView',
            slug: PermissionSlugs.PostsView,
            label: 'View',
          },
          {
            key: 'PostsCreate',
            slug: PermissionSlugs.PostsCreate,
            label: 'Create',
          },
          {
            key: 'PostsUpdate',
            slug: PermissionSlugs.PostsUpdate,
            label: 'Update',
          },
          {
            key: 'PostsDelete',
            slug: PermissionSlugs.PostsDelete,
            label: 'Delete',
          },
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
        permissions: [
          {
            key: 'FilesView',
            slug: PermissionSlugs.FilesView,
            label: 'View',
          },
          {
            key: 'FilesCreate',
            slug: PermissionSlugs.FilesCreate,
            label: 'Create',
          },
          {
            key: 'FilesUpdate',
            slug: PermissionSlugs.FilesUpdate,
            label: 'Update',
          },
          {
            key: 'FilesDelete',
            slug: PermissionSlugs.FilesDelete,
            label: 'Delete',
          },
        ],
      },
    ],
  },
  {
    id: 'categories',
    label: 'Categories',
    screens: [
      {
        id: 'categories',
        label: 'Categories',
        permissions: [
          {
            key: 'CategoriesView',
            slug: PermissionSlugs.CategoriesView,
            label: 'View',
          },
          {
            key: 'CategoriesCreate',
            slug: PermissionSlugs.CategoriesCreate,
            label: 'Create',
          },
          {
            key: 'CategoriesUpdate',
            slug: PermissionSlugs.CategoriesUpdate,
            label: 'Update',
          },
          {
            key: 'CategoriesDelete',
            slug: PermissionSlugs.CategoriesDelete,
            label: 'Delete',
          },
        ],
      },
    ],
  },
  {
    id: 'styles',
    label: 'Styles',
    screens: [
      {
        id: 'styles',
        label: 'Styles',
        permissions: [
          {
            key: 'StylesView',
            slug: PermissionSlugs.StylesView,
            label: 'View',
          },
          {
            key: 'StylesCreate',
            slug: PermissionSlugs.StylesCreate,
            label: 'Create',
          },
          {
            key: 'StylesDelete',
            slug: PermissionSlugs.StylesDelete,
            label: 'Delete',
          },
        ],
      },
    ],
  },
  {
    id: 'channels',
    label: 'Channels',
    screens: [
      {
        id: 'channels',
        label: 'Channels',
        permissions: [
          {
            key: 'ChannelsView',
            slug: PermissionSlugs.ChannelsView,
            label: 'View',
          },
          {
            key: 'ChannelsCreate',
            slug: PermissionSlugs.ChannelsCreate,
            label: 'Create',
          },
          {
            key: 'ChannelsDelete',
            slug: PermissionSlugs.ChannelsDelete,
            label: 'Delete',
          },
        ],
      },
    ],
  },
  {
    id: 'follows',
    label: 'Follows',
    screens: [
      {
        id: 'follows',
        label: 'Follows',
        permissions: [
          {
            key: 'FollowsView',
            slug: PermissionSlugs.FollowsView,
            label: 'View',
          },
          {
            key: 'FollowsDelete',
            slug: PermissionSlugs.FollowsDelete,
            label: 'Delete',
          },
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
          {
            key: 'KeywordSetsView',
            slug: PermissionSlugs.KeywordSetsView,
            label: 'View',
          },
          {
            key: 'KeywordSetsCreate',
            slug: PermissionSlugs.KeywordSetsCreate,
            label: 'Create',
          },
          {
            key: 'KeywordSetsUpdate',
            slug: PermissionSlugs.KeywordSetsUpdate,
            label: 'Update',
          },
          {
            key: 'KeywordSetsDelete',
            slug: PermissionSlugs.KeywordSetsDelete,
            label: 'Delete',
          },
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
          {
            key: 'BusinessCentersView',
            slug: PermissionSlugs.BusinessCentersView,
            label: 'View',
          },
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
          {
            key: 'AccountsView',
            slug: PermissionSlugs.AccountsView,
            label: 'View',
          },
          {
            key: 'AccountsCreate',
            slug: PermissionSlugs.AccountsCreate,
            label: 'Create',
          },
          {
            key: 'AccountsUpdate',
            slug: PermissionSlugs.AccountsUpdate,
            label: 'Update',
          },
          {
            key: 'AccountsDelete',
            slug: PermissionSlugs.AccountsDelete,
            label: 'Delete',
          },
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
          {
            key: 'TeamsView',
            slug: PermissionSlugs.TeamsView,
            label: 'View',
          },
          {
            key: 'TeamsCreate',
            slug: PermissionSlugs.TeamsCreate,
            label: 'Create',
          },
          {
            key: 'TeamsUpdate',
            slug: PermissionSlugs.TeamsUpdate,
            label: 'Update',
          },
          {
            key: 'TeamsDelete',
            slug: PermissionSlugs.TeamsDelete,
            label: 'Delete',
          },
          {
            key: 'TeamsAssign',
            slug: PermissionSlugs.TeamsAssign,
            label: 'Assign users',
          },
        ],
      },
    ],
  },
  {
    id: 'ad-clients',
    label: 'Ad Clients',
    screens: [
      {
        id: 'ad-clients',
        label: 'Ad Clients',
        permissions: [
          {
            key: 'AdClientsView',
            slug: PermissionSlugs.AdClientsView,
            label: 'View',
          },
          {
            key: 'AdClientsCreate',
            slug: PermissionSlugs.AdClientsCreate,
            label: 'Create',
          },
          {
            key: 'AdClientsUpdate',
            slug: PermissionSlugs.AdClientsUpdate,
            label: 'Update',
          },
          {
            key: 'AdClientsDelete',
            slug: PermissionSlugs.AdClientsDelete,
            label: 'Delete',
          },
        ],
      },
    ],
  },
  {
    id: 'campaign-rule-settings',
    label: 'Campaign Rule Settings',
    screens: [
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
            key: 'GoogleConversionsUpdate',
            slug: PermissionSlugs.GoogleConversionsUpdate,
            label: 'Update',
          },
          {
            key: 'GoogleConversionsCreate',
            slug: PermissionSlugs.GoogleConversionsCreate,
            label: 'Create',
          },
        ],
      },
    ],
  },
]

/**
 * Permission slugs mirror `App\Enums\Permission` (Laravel). Roles store any subset in `role_permissions` (unlimited rows).
 * API exposes `permissions: string[]` on user and role resources.
 */

export const PermissionSlugs = {
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
} as const

export function allPermissionSlugs(): string[] {
  return Object.values(PermissionSlugs)
}

export function hasFullAccess(perms: string[]): boolean {
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
    ],
  },
]

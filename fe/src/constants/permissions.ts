/**
 * Bit flags mirror `App\Enums\Permission` (Laravel). One scope = one bit in `roles.permission_mask`.
 * `PermissionScope` strings and `PermissionBits` keys stay aligned with the backend enum names (`key`).
 */

export const PermissionScope = {
  ALL: '*',
  report: {
    overview: {
      view: 'report.overview.view',
    },
    export: {
      run: 'report.export',
    },
  },
  settings: {
    users: {
      view: 'settings.users.view',
      create: 'settings.users.create',
      update: 'settings.users.update',
      delete: 'settings.users.delete',
    },
    roles: {
      view: 'settings.roles.view',
      create: 'settings.roles.create',
      update: 'settings.roles.update',
      delete: 'settings.roles.delete',
      assign: 'settings.roles.assign',
    },
  },
} as const

/** Integer values must match `App\Enums\Permission` cases (same bit positions). */
export const PermissionBits = {
  ReportOverviewView: 1 << 0,
  ReportExport: 1 << 1,
  SettingsUsersView: 1 << 2,
  SettingsUsersCreate: 1 << 3,
  SettingsUsersUpdate: 1 << 4,
  SettingsUsersDelete: 1 << 5,
  SettingsRolesView: 1 << 6,
  SettingsRolesCreate: 1 << 7,
  SettingsRolesUpdate: 1 << 8,
  SettingsRolesDelete: 1 << 9,
  SettingsRolesAssign: 1 << 10,
} as const

/** Maps UI/route scope strings → bitmask keys returned on `user.permissions` from the API. */
export const PERMISSION_SCOPE_TO_KEY: Record<string, keyof typeof PermissionBits> = {
  [PermissionScope.report.overview.view]: 'ReportOverviewView',
  [PermissionScope.report.export.run]: 'ReportExport',
  [PermissionScope.settings.users.view]: 'SettingsUsersView',
  [PermissionScope.settings.users.create]: 'SettingsUsersCreate',
  [PermissionScope.settings.users.update]: 'SettingsUsersUpdate',
  [PermissionScope.settings.users.delete]: 'SettingsUsersDelete',
  [PermissionScope.settings.roles.view]: 'SettingsRolesView',
  [PermissionScope.settings.roles.create]: 'SettingsRolesCreate',
  [PermissionScope.settings.roles.update]: 'SettingsRolesUpdate',
  [PermissionScope.settings.roles.delete]: 'SettingsRolesDelete',
  [PermissionScope.settings.roles.assign]: 'SettingsRolesAssign',
}

export function fullPermissionMask(): number {
  let m = 0
  for (const v of Object.values(PermissionBits)) {
    m |= v
  }
  return m
}

export type PermissionDefinition = {
  key: keyof typeof PermissionBits
  bit: number
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

/** Role UI: only groups/screens that exist in the app today (Settings → Roles). */
export const PERMISSION_CATALOG: PermissionCluster[] = [
  {
    id: 'settings',
    label: 'Settings',
    screens: [
      {
        id: 'roles',
        label: 'Roles',
        permissions: [
          {
            key: 'SettingsRolesView',
            bit: PermissionBits.SettingsRolesView,
            label: 'View',
          },
          {
            key: 'SettingsRolesCreate',
            bit: PermissionBits.SettingsRolesCreate,
            label: 'Create',
          },
          {
            key: 'SettingsRolesUpdate',
            bit: PermissionBits.SettingsRolesUpdate,
            label: 'Update',
          },
          {
            key: 'SettingsRolesDelete',
            bit: PermissionBits.SettingsRolesDelete,
            label: 'Delete',
          },
          {
            key: 'SettingsRolesAssign',
            bit: PermissionBits.SettingsRolesAssign,
            label: 'Assign permissions',
          },
        ],
      },
    ],
  },
]

export const PERMISSION_SCOPES: readonly string[] = [
  PermissionScope.ALL,
  ...Object.keys(PERMISSION_SCOPE_TO_KEY),
]

export type PermissionScopeValue = (typeof PERMISSION_SCOPES)[number]

export function hasPermission(scopes: string[] | undefined | null, required: string): boolean {
  console.log('scopes', scopes)
  if (!scopes?.length) {
    return false
  }
  if (scopes.includes(PermissionScope.ALL)) {
    return true
  }
  if (scopes.includes(required)) {
    return true
  }
  const key = PERMISSION_SCOPE_TO_KEY[required]
  return key != null && scopes.includes(key)
}

export function maskHasPermission(mask: number | undefined | null, requiredBit: number): boolean {
  if (mask == null) {
    return false
  }
  const full = fullPermissionMask()
  if (mask !== 0 && (mask & full) === full) {
    return true
  }
  return (mask & requiredBit) === requiredBit
}

export function isFullPermissionMask(mask: number): boolean {
  const full = fullPermissionMask()
  return mask !== 0 && (mask & full) === full
}

export function countActivePermissionBits(mask: number): number {
  if (isFullPermissionMask(mask)) {
    return Object.values(PermissionBits).length
  }
  let c = 0
  for (const v of Object.values(PermissionBits)) {
    if ((mask & v) === v) {
      c++
    }
  }
  return c
}

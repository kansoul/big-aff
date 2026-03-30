/**
 * Bit flags mirror `App\Enums\Permission` (Laravel). One permission = one bit in `roles.permission_mask`.
 * Route guards and UI checks use `permission_mask` with `PermissionBits` values.
 */

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
        id: 'users',
        label: 'Users',
        permissions: [
          {
            key: 'SettingsUsersView',
            bit: PermissionBits.SettingsUsersView,
            label: 'View',
          },
          {
            key: 'SettingsUsersCreate',
            bit: PermissionBits.SettingsUsersCreate,
            label: 'Create',
          },
          {
            key: 'SettingsUsersUpdate',
            bit: PermissionBits.SettingsUsersUpdate,
            label: 'Update',
          },
          {
            key: 'SettingsUsersDelete',
            bit: PermissionBits.SettingsUsersDelete,
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

/** Whether the current user’s mask includes the required permission bit (or full mask). */
export function hasPermission(
  permissionMask: number | undefined | null,
  requiredBit: number,
): boolean {
  return maskHasPermission(permissionMask, requiredBit)
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

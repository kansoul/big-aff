import type { LucideIcon } from 'lucide-react'

import { NAV_SECTIONS, PATHS, type NavSectionId } from '@/constants/paths'
import { PermissionBits } from '@/constants/permissions'
import { GitBranch, LayoutDashboard, Settings, UserCog, Users } from 'lucide-react'

export type NavSubItem = {
  name: string
  href: string
  icon: LucideIcon
  /** Permission bit (`PermissionBits.*`) required to show this link. */
  requiredPermission?: number
}

export type NavItem = {
  name: string
  href?: string
  icon: LucideIcon
  items?: NavSubItem[]
  /** When set, parent row matches `handle.navSection` on the active route (see `routes/index.tsx`). */
  navSection?: NavSectionId
}

export const NAVIGATION_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: PATHS.dashboard, icon: LayoutDashboard },
  {
    name: 'Settings',
    icon: Settings,
    navSection: NAV_SECTIONS.settings,
    items: [
      {
        name: 'Users',
        href: PATHS.settingsUsers,
        icon: Users,
        requiredPermission: PermissionBits.SettingsUsersView,
      },
      {
        name: 'Users & children',
        href: PATHS.settingsUsersAssign,
        icon: GitBranch,
        requiredPermission: PermissionBits.SettingsUsersView,
      },
      {
        name: 'Roles',
        href: PATHS.settingsRoles,
        icon: UserCog,
        requiredPermission: PermissionBits.SettingsRolesView,
      },
    ],
  },
]

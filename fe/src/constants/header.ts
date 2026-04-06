import type { LucideIcon } from 'lucide-react'

import { NAV_SECTIONS, PATHS, type NavSectionId } from '@/constants/paths'
import { PermissionSlugs } from '@/constants/permissions'
import { GitBranch, Globe, Images, LayoutDashboard, Settings, UserCog, Users } from 'lucide-react'

export type NavSubItem = {
  name: string
  href: string
  icon: LucideIcon
  /** Permission slug (`PermissionSlugs.*`) required to show this link. */
  requiredPermission?: string
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
  { name: 'Media', href: PATHS.media, icon: Images },
  {
    name: 'Settings',
    icon: Settings,
    navSection: NAV_SECTIONS.settings,
    items: [
      {
        name: 'Users',
        href: PATHS.settingsUsers,
        icon: Users,
        requiredPermission: PermissionSlugs.SettingsUsersView,
      },
      {
        name: 'Users & children',
        href: PATHS.settingsUsersAssign,
        icon: GitBranch,
        requiredPermission: PermissionSlugs.SettingsUsersView,
      },
      {
        name: 'Roles',
        href: PATHS.settingsRoles,
        icon: UserCog,
        requiredPermission: PermissionSlugs.SettingsRolesView,
      },
      {
        name: 'Sites',
        href: PATHS.settingsSites,
        icon: Globe,
        requiredPermission: PermissionSlugs.SettingsSitesView,
      },
    ],
  },
]

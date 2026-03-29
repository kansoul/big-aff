import type { LucideIcon } from 'lucide-react'

import { PermissionScope } from '@/constants/permissions'
import { LayoutDashboard, Settings, UserCog } from 'lucide-react'

export type NavSubItem = {
  name: string
  href: string
  icon: LucideIcon
  requiredPermission?: string
}

export type NavItem = {
  name: string
  href?: string
  icon: LucideIcon
  items?: NavSubItem[]
}

export const NAVIGATION_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  {
    name: 'Settings',
    icon: Settings,
    items: [
      {
        name: 'Roles',
        href: '/settings/roles',
        icon: UserCog,
        requiredPermission: PermissionScope.settings.roles.view,
      },
    ],
  },
]

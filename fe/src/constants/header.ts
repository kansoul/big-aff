import type { LucideIcon } from 'lucide-react'

import { PATHS, type NavSectionId } from '@/constants/paths'
import { PermissionSlugs } from '@/constants/permissions'
import {
  BarChart3,
  Building2,
  FileText,
  FolderOpen,
  GitBranch,
  Globe,
  Images,
  LayoutDashboard,
  Link2,
  Palette,
  Radio,
  SlidersHorizontal,
  UserCheck,
  UserCog,
  Users,
  UsersRound,
  Wallet,
} from 'lucide-react'

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
  icon?: LucideIcon
  items?: NavSubItem[]
  /** When set, parent row matches `handle.navSection` on the active route (see `routes/index.tsx`). */
  navSection?: NavSectionId
}

export const NAVIGATION_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: PATHS.dashboard, icon: LayoutDashboard },
  {
    name: 'Content',
    items: [
      {
        name: 'Posts',
        href: PATHS.posts,
        icon: FileText,
        requiredPermission: PermissionSlugs.PostsView,
      },
      {
        name: 'Categories',
        href: PATHS.categories,
        icon: FolderOpen,
        requiredPermission: PermissionSlugs.CategoriesView,
      },
      {
        name: 'Media',
        href: PATHS.media,
        icon: Images,
        requiredPermission: PermissionSlugs.FilesView,
      },
    ],
  },
  {
    name: 'Marketing',
    items: [
      {
        name: 'Channels',
        href: PATHS.channels,
        icon: Radio,
        requiredPermission: PermissionSlugs.ChannelsView,
      },
      {
        name: 'Styles',
        href: PATHS.styles,
        icon: Palette,
        requiredPermission: PermissionSlugs.StylesView,
      },
      {
        name: 'Follows',
        href: PATHS.follows,
        icon: UserCheck,
      },
      {
        name: 'Ads Links',
        href: PATHS.adsLinks,
        icon: Link2,
        requiredPermission: PermissionSlugs.AdsLinksView,
      },
    ],
  },
  {
    name: 'Organization',
    items: [
      {
        name: 'Users',
        href: PATHS.settingsUsers,
        icon: Users,
        requiredPermission: PermissionSlugs.SettingsUsersView,
      },
      {
        name: 'Sub-Users',
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
    ],
  },
  {
    name: 'Adsense',
    items: [
      {
        name: 'Ad Clients',
        href: PATHS.adClients,
        icon: UserCog,
        requiredPermission: PermissionSlugs.AdClientsView,
      },
    ],
  },
  {
    name: 'Report',
    items: [
      {
        name: 'Style Report',
        href: PATHS.adsenseStyleReport,
        icon: BarChart3,
        requiredPermission: PermissionSlugs.AdClientsView,
      },
    ],
  },
  {
    name: 'System',
    items: [
      {
        name: 'Sites',
        href: PATHS.settingsSites,
        icon: Globe,
        requiredPermission: PermissionSlugs.SettingsSitesView,
      },
      {
        name: 'Business Centers',
        href: PATHS.businessCenters,
        icon: Building2,
        requiredPermission: PermissionSlugs.BusinessCentersView,
      },
      {
        name: 'Accounts',
        href: PATHS.accounts,
        icon: Wallet,
        requiredPermission: PermissionSlugs.AccountsView,
      },
      {
        name: 'Campaign Rules',
        href: PATHS.campaignRuleSettings,
        icon: SlidersHorizontal,
        requiredPermission: PermissionSlugs.CampaignRuleSettingsView,
      },
      {
        name: 'Teams',
        href: PATHS.teams,
        icon: UsersRound,
        requiredPermission: PermissionSlugs.TeamsView,
      },
      {
        name: 'Assign Teams',
        href: PATHS.teamsAssignUsers,
        icon: UsersRound,
        requiredPermission: PermissionSlugs.TeamsAssign,
      },
    ],
  },
]

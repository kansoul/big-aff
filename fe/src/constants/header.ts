import type { LucideIcon } from 'lucide-react'

import { PATHS, type NavSectionId } from '@/constants/paths'
import { PermissionSlugs } from '@/constants/permissions'
import {
  Building2,
  CircleDollarSign,
  FileText,
  FolderOpen,
  Globe,
  Images,
  LayoutDashboard,
  Link2,
  LogsIcon,
  Megaphone,
  Palette,
  Radio,
  Repeat,
  SlidersHorizontal,
  Target,
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
      {
        name: 'Sites',
        href: PATHS.settingsSites,
        icon: Globe,
        requiredPermission: PermissionSlugs.SettingsSitesView,
      },
      {
        name: 'Follows',
        href: PATHS.follows,
        icon: UserCheck,
        requiredPermission: PermissionSlugs.FollowsView,
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
        name: 'Ads Links',
        href: PATHS.adsLinks,
        icon: Link2,
        requiredPermission: PermissionSlugs.AdsLinksView,
      },
    ],
  },
  {
    name: 'Report',
    items: [
      {
        name: 'Ads Report',
        href: PATHS.adsReport,
        icon: Target,
        requiredPermission: PermissionSlugs.AdsReportView,
      },
      {
        name: 'Revenue Report',
        href: PATHS.revenueReport,
        icon: CircleDollarSign,
        requiredPermission: PermissionSlugs.RevenueStatsView,
      },
      {
        name: 'Campaign Report',
        href: PATHS.campaignReport,
        icon: Megaphone,
        requiredPermission: PermissionSlugs.CampaignReportsView,
      },
    ],
  },
  {
    name: 'Ads',
    items: [
      {
        name: 'Ad Clients',
        href: PATHS.adClients,
        icon: UserCog,
        requiredPermission: PermissionSlugs.AdClientsView,
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
        name: 'Google Conversions',
        href: PATHS.googleConversions,
        icon: Repeat,
        requiredPermission: PermissionSlugs.GoogleConversionsView,
      },
      {
        name: 'Campaign Rules',
        href: PATHS.campaignRuleSettings,
        icon: SlidersHorizontal,
        requiredPermission: PermissionSlugs.CampaignRuleSettingsView,
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
        name: 'Teams',
        href: PATHS.teams,
        icon: UsersRound,
        requiredPermission: PermissionSlugs.TeamsView,
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
    name: 'System',
    items: [
      {
        name: 'Logs',
        href: PATHS.logs,
        icon: LogsIcon,
        requiredPermission: PermissionSlugs.LogsView,
      },
    ],
  },
]

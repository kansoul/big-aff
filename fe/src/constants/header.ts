import type { LucideIcon } from 'lucide-react'

import { PATHS, type NavSectionId } from '@/constants/paths'
import { PermissionSlugs } from '@/constants/permissions'
import {
  Building2,
  CircleDollarSign,
  Globe,
  Images,
  LayoutDashboard,
  Link2,
  LogsIcon,
  Megaphone,
  Repeat,
  SlidersHorizontal,
  Tag,
  Target,
  UserCheck,
  UserCog,
  Users,
  UsersRound,
  Wallet,
  ReceiptEuroIcon,
  Network,
} from 'lucide-react'

export type NavSubItem = {
  name: string
  href: string
  icon: LucideIcon
  /** Permission slug (`PermissionSlugs.*`) required to show this link. */
  requiredPermission?: string
  adminOnly?: boolean
  mainSystemOnly?: boolean
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
  { name: 'New Campaign', href: PATHS.newCampaign, icon: Megaphone },
  {
    name: 'Content',
    items: [
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
        name: 'Spend Report',
        href: PATHS.adsReport,
        icon: Target,
        requiredPermission: PermissionSlugs.AdsReportView,
      },
      {
        name: 'Revenue Report',
        href: PATHS.revenueReport,
        icon: ReceiptEuroIcon,
        requiredPermission: PermissionSlugs.RevenueReportsView,
      },
      {
        name: 'Team Report',
        href: PATHS.teamReport,
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
        name: 'Gtags',
        href: PATHS.gtags,
        icon: Tag,
        requiredPermission: PermissionSlugs.GtagsView,
      },
      {
        name: 'Pixels',
        href: PATHS.pixels,
        icon: Tag,
        requiredPermission: PermissionSlugs.PixelsView,
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
        name: 'Main Teams',
        href: PATHS.mainTeams,
        icon: Network,
        adminOnly: true,
        mainSystemOnly: true,
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

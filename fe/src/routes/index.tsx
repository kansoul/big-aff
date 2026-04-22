import { lazy, type ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import { RequirePermission } from '@/app/router/RequirePermission'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { NAV_SECTIONS, PATHS, routeSegment } from '@/constants/paths'
import { PermissionSlugs } from '@/constants/permissions'
import { PageLoader } from '@/components/common/PageLoader'

const AuthLayout = lazy(() => import('@/layouts/AuthLayout'))
const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
)

function withPermission(Page: ComponentType, permission: string): ComponentType {
  function PermissionGuard() {
    return (
      <RequirePermission permission={permission}>
        <Page />
      </RequirePermission>
    )
  }
  return PermissionGuard
}

export const router = createBrowserRouter([
  {
    path: PATHS.root,
    element: <Navigate to={PATHS.dashboard} replace />,
  },
  {
    path: PATHS.root,
    element: <AuthLayout />,
    children: [
      {
        path: routeSegment(PATHS.login),
        element: <LoginPage />,
        handle: { title: 'Login' },
      },
    ],
  },
  {
    path: '*',
    lazy: async () => {
      const { NotFoundPage } = await import('@/features/errors/pages/NotFoundPage')
      return { Component: NotFoundPage }
    },
  },
  {
    path: PATHS.root,
    element: <ProtectedRoute />,
    HydrateFallback: PageLoader,
    children: [
      {
        path: PATHS.root,
        element: <DashboardLayout />,
        children: [
          {
            path: routeSegment(PATHS.dashboard),
            lazy: async () => {
              const { DashboardPage } = await import('@/features/dashboard/pages/DashboardPage')
              return { Component: DashboardPage }
            },
            handle: { title: 'Dashboard', navSection: NAV_SECTIONS.dashboard },
          },
          {
            path: routeSegment(PATHS.media),
            lazy: async () => {
              const { MediaPage } = await import('@/features/media/pages/MediaPage')
              return { Component: MediaPage }
            },
            handle: { title: 'Media' },
          },
          {
            path: routeSegment(PATHS.posts),
            lazy: async () => {
              const { PostsPage } = await import('@/features/posts/pages/PostsPage')
              return {
                Component: withPermission(PostsPage, PermissionSlugs.PostsView),
              }
            },
            handle: { title: 'Posts' },
          },
          {
            path: routeSegment(PATHS.postsCreate),
            lazy: async () => {
              const { CreatePostPage } = await import('@/features/posts/pages/CreatePostPage')
              return {
                Component: withPermission(CreatePostPage, PermissionSlugs.PostsCreate),
              }
            },
            handle: { title: 'Create Post' },
          },
          {
            path: routeSegment(PATHS.postsView),
            lazy: async () => {
              const { ViewPostPage } = await import('@/features/posts/pages/ViewPostPage')
              return {
                Component: withPermission(ViewPostPage, PermissionSlugs.PostsView),
              }
            },
            handle: { title: 'View Post' },
          },
          {
            path: routeSegment(PATHS.postsEdit),
            lazy: async () => {
              const { EditPostPage } = await import('@/features/posts/pages/EditPostPage')
              return {
                Component: withPermission(EditPostPage, PermissionSlugs.PostsUpdate),
              }
            },
            handle: { title: 'Edit Post' },
          },
          {
            path: routeSegment(PATHS.categories),
            lazy: async () => {
              const { CategoriesPage } = await import('@/features/categories/pages/CategoriesPage')
              return {
                Component: withPermission(CategoriesPage, PermissionSlugs.CategoriesView),
              }
            },
            handle: { title: 'Categories' },
          },
          {
            path: routeSegment(PATHS.settingsUsers),
            lazy: async () => {
              const { SettingsUsersPage } = await import('@/features/users/pages/SettingsUsersPage')
              return {
                Component: withPermission(SettingsUsersPage, PermissionSlugs.SettingsUsersView),
              }
            },
            handle: { title: 'Users', navSection: NAV_SECTIONS.settings },
          },
          {
            path: routeSegment(PATHS.teams),
            lazy: async () => {
              const { TeamsPage } = await import('@/features/teams/pages/TeamsPage')
              return {
                Component: withPermission(TeamsPage, PermissionSlugs.TeamsView),
              }
            },
            handle: { title: 'Teams' },
          },
          {
            path: routeSegment(PATHS.channels),
            lazy: async () => {
              const { ChannelsPage } = await import('@/features/channels/pages/ChannelsPage')
              return {
                Component: withPermission(ChannelsPage, PermissionSlugs.ChannelsView),
              }
            },
            handle: { title: 'Channels' },
          },
          {
            path: routeSegment(PATHS.styles),
            lazy: async () => {
              const { StylesPage } = await import('@/features/styles/pages/StylesPage')
              return {
                Component: withPermission(StylesPage, PermissionSlugs.StylesView),
              }
            },
            handle: { title: 'Styles' },
          },
          {
            path: routeSegment(PATHS.adsLinks),
            lazy: async () => {
              const { AdsLinksPage } = await import('@/features/ads-links/pages/AdsLinksPage')
              return {
                Component: withPermission(AdsLinksPage, PermissionSlugs.AdsLinksView),
              }
            },
            handle: { title: 'Ads Links' },
          },
          {
            path: routeSegment(PATHS.follows),
            lazy: async () => {
              const { FollowsPage } = await import('@/features/follows/pages/FollowsPage')
              return {
                Component: withPermission(FollowsPage, PermissionSlugs.FollowsView),
              }
            },
            handle: { title: 'Follows' },
          },
          {
            path: routeSegment(PATHS.settingsRoles),
            lazy: async () => {
              const { SettingsRolesPage } =
                await import('@/features/settings/pages/SettingsRolesPage')
              return {
                Component: withPermission(SettingsRolesPage, PermissionSlugs.SettingsRolesView),
              }
            },
            handle: { title: 'Roles', navSection: NAV_SECTIONS.settings },
          },
          {
            path: routeSegment(PATHS.settingsSites),
            lazy: async () => {
              const { SettingsSitesPage } = await import('@/features/sites/pages/SettingsSitesPage')
              return {
                Component: withPermission(SettingsSitesPage, PermissionSlugs.SettingsSitesView),
              }
            },
            handle: { title: 'Sites', navSection: NAV_SECTIONS.settings },
          },
          {
            path: routeSegment(PATHS.settingsSitesCreate),
            lazy: async () => {
              const { CreateSitePage } = await import('@/features/sites/pages/CreateSitePage')
              return {
                Component: withPermission(CreateSitePage, PermissionSlugs.SettingsSitesCreate),
              }
            },
            handle: { title: 'Create Site', navSection: NAV_SECTIONS.settings },
          },
          {
            path: routeSegment(PATHS.settingsSitesView),
            lazy: async () => {
              const { ViewSitePage } = await import('@/features/sites/pages/ViewSitePage')
              return { Component: withPermission(ViewSitePage, PermissionSlugs.SettingsSitesView) }
            },
            handle: { title: 'View Site', navSection: NAV_SECTIONS.settings },
          },
          {
            path: routeSegment(PATHS.settingsSitesEdit),
            lazy: async () => {
              const { EditSitePage } = await import('@/features/sites/pages/EditSitePage')
              return {
                Component: withPermission(EditSitePage, PermissionSlugs.SettingsSitesUpdate),
              }
            },
            handle: { title: 'Edit Site', navSection: NAV_SECTIONS.settings },
          },
          {
            path: routeSegment(PATHS.businessCenters),
            lazy: async () => {
              const { BusinessCentersPage } =
                await import('@/features/business-centers/pages/BusinessCentersPage')
              return {
                Component: withPermission(BusinessCentersPage, PermissionSlugs.BusinessCentersView),
              }
            },
            handle: { title: 'Business Centers' },
          },
          {
            path: routeSegment(PATHS.accounts),
            lazy: async () => {
              const { AccountsPage } = await import('@/features/accounts/pages/AccountsPage')
              return {
                Component: withPermission(AccountsPage, PermissionSlugs.AccountsView),
              }
            },
            handle: { title: 'Accounts' },
          },
          {
            path: routeSegment(PATHS.campaignRuleSettings),
            lazy: async () => {
              const { CampaignRuleSettingsPage } =
                await import('@/features/campaign-rule-settings/pages/CampaignRuleSettingsPage')
              return {
                Component: withPermission(
                  CampaignRuleSettingsPage,
                  PermissionSlugs.CampaignRuleSettingsView,
                ),
              }
            },
            handle: { title: 'Manage Campaign Rule Settings' },
          },
          {
            path: routeSegment(PATHS.adClients),
            lazy: async () => {
              const { AdClientsPage } = await import('@/features/ad-clients/pages/AdClientsPage')
              return {
                Component: withPermission(AdClientsPage, PermissionSlugs.AdClientsView),
              }
            },
            handle: { title: 'Ad Clients' },
          },
          {
            path: routeSegment(PATHS.adsReport),
            lazy: async () => {
              const { AdsReportPage } = await import('@/features/ads-report/pages/AdsReportPage')
              return {
                Component: withPermission(AdsReportPage, PermissionSlugs.AdsReportView),
              }
            },
            handle: { title: 'Ads Report' },
          },
          {
            path: routeSegment(PATHS.revenueReport),
            lazy: async () => {
              const { RevenueReportPage } =
                await import('@/features/revenue-report/pages/RevenueReportPage')
              return {
                Component: withPermission(RevenueReportPage, PermissionSlugs.RevenueReportsView),
              }
            },
            handle: { title: 'Revenue Report' },
          },
          {
            path: routeSegment(PATHS.googleConversions),
            lazy: async () => {
              const { GoogleConversionsPage } =
                await import('@/features/google-conversions/pages/GoogleConversionsPage')
              return {
                Component: withPermission(
                  GoogleConversionsPage,
                  PermissionSlugs.GoogleConversionsView,
                ),
              }
            },
            handle: { title: 'Google Conversions' },
          },
          {
            path: routeSegment(PATHS.campaignReport),
            lazy: async () => {
              const { CampaignReportPage } =
                await import('@/features/campaign-report/pages/CampaignReportPage')
              return {
                Component: withPermission(CampaignReportPage, PermissionSlugs.CampaignReportsView),
              }
            },
            handle: { title: 'Campaign Report' },
          },
          {
            path: routeSegment(PATHS.logs),
            lazy: async () => {
              const { LogsPage } = await import('@/features/logs/pages/LogsPage')
              return {
                Component: withPermission(LogsPage, PermissionSlugs.LogsView),
              }
            },
            handle: { title: 'Logs' },
          },
        ],
      },
    ],
  },
])

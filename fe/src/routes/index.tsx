import { lazy, type ComponentType } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import { RequirePermission } from '@/app/router/RequirePermission'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { NAV_SECTIONS, PATHS, routeSegment } from '@/constants/paths'
import { PermissionSlugs } from '@/constants/permissions'

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
    path: PATHS.root,
    element: <ProtectedRoute />,
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
            path: routeSegment(PATHS.settingsUsersAssign),
            lazy: async () => {
              const { AssignUsersPage } = await import('@/features/users/pages/AssignUsersPage')
              return {
                Component: withPermission(AssignUsersPage, PermissionSlugs.SettingsUsersView),
              }
            },
            handle: { title: 'Users & Child Users', navSection: NAV_SECTIONS.settings },
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
        ],
      },
    ],
  },
])

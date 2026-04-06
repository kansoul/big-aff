import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import { RequirePermission } from '@/app/router/RequirePermission'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { NAV_SECTIONS, PATHS, routeSegment } from '@/constants/paths'
import { PermissionSlugs } from '@/constants/permissions'

const AuthLayout = lazy(() => import('@/layouts/AuthLayout'))
const DashboardLayout = lazy(() =>
  import('@/layouts/DashboardLayout').then((m) => ({ default: m.DashboardLayout })),
)
const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const SettingsRolesPage = lazy(() =>
  import('@/features/settings/pages/SettingsRolesPage').then((m) => ({
    default: m.SettingsRolesPage,
  })),
)
const SettingsUsersPage = lazy(() =>
  import('@/features/users/pages/SettingsUsersPage').then((m) => ({
    default: m.SettingsUsersPage,
  })),
)
const AssignUsersPage = lazy(() =>
  import('@/features/users/pages/AssignUsersPage').then((m) => ({
    default: m.AssignUsersPage,
  })),
)
const MediaPage = lazy(() =>
  import('@/features/media/pages/MediaPage').then((m) => ({ default: m.MediaPage })),
)
const SettingsSitesPage = lazy(() =>
  import('@/features/sites/pages/SettingsSitesPage').then((m) => ({
    default: m.SettingsSitesPage,
  })),
)
const CreateSitePage = lazy(() =>
  import('@/features/sites/pages/CreateSitePage').then((m) => ({
    default: m.CreateSitePage,
  })),
)
const ViewSitePage = lazy(() =>
  import('@/features/sites/pages/ViewSitePage').then((m) => ({
    default: m.ViewSitePage,
  })),
)
const EditSitePage = lazy(() =>
  import('@/features/sites/pages/EditSitePage').then((m) => ({
    default: m.EditSitePage,
  })),
)

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
            element: <DashboardPage />,
            handle: { title: 'Dashboard', navSection: NAV_SECTIONS.dashboard },
          },
          {
            path: routeSegment(PATHS.media),
            element: <MediaPage />,
            handle: { title: 'Media' },
          },
          {
            path: routeSegment(PATHS.settingsUsers),
            element: (
              <RequirePermission permission={PermissionSlugs.SettingsUsersView}>
                <SettingsUsersPage />
              </RequirePermission>
            ),
            handle: { title: 'Users', navSection: NAV_SECTIONS.settings },
          },
          {
            path: routeSegment(PATHS.settingsUsersAssign),
            element: (
              <RequirePermission permission={PermissionSlugs.SettingsUsersView}>
                <AssignUsersPage />
              </RequirePermission>
            ),
            handle: { title: 'Users & Child Users', navSection: NAV_SECTIONS.settings },
          },
          {
            path: routeSegment(PATHS.settingsRoles),
            element: (
              <RequirePermission permission={PermissionSlugs.SettingsRolesView}>
                <SettingsRolesPage />
              </RequirePermission>
            ),
            handle: { title: 'Roles', navSection: NAV_SECTIONS.settings },
          },
          {
            path: routeSegment(PATHS.settingsSites),
            element: (
              <RequirePermission permission={PermissionSlugs.SettingsSitesView}>
                <SettingsSitesPage />
              </RequirePermission>
            ),
            handle: { title: 'Sites', navSection: NAV_SECTIONS.settings },
          },
          {
            path: routeSegment(PATHS.settingsSitesCreate),
            element: (
              <RequirePermission permission={PermissionSlugs.SettingsSitesCreate}>
                <CreateSitePage />
              </RequirePermission>
            ),
            handle: { title: 'Create Site', navSection: NAV_SECTIONS.settings },
          },
          {
            path: routeSegment(PATHS.settingsSitesView),
            element: (
              <RequirePermission permission={PermissionSlugs.SettingsSitesView}>
                <ViewSitePage />
              </RequirePermission>
            ),
            handle: { title: 'View Site', navSection: NAV_SECTIONS.settings },
          },
          {
            path: routeSegment(PATHS.settingsSitesEdit),
            element: (
              <RequirePermission permission={PermissionSlugs.SettingsSitesUpdate}>
                <EditSitePage />
              </RequirePermission>
            ),
            handle: { title: 'Edit Site', navSection: NAV_SECTIONS.settings },
          },
        ],
      },
    ],
  },
])

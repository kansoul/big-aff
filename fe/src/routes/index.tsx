import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import { RequirePermission } from '@/app/router/RequirePermission'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { NAV_SECTIONS, PATHS, routeSegment } from '@/constants/paths'
import { PermissionBits } from '@/constants/permissions'

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
            path: routeSegment(PATHS.settingsUsers),
            element: (
              <RequirePermission permission={PermissionBits.SettingsUsersView}>
                <SettingsUsersPage />
              </RequirePermission>
            ),
            handle: { title: 'Users', navSection: NAV_SECTIONS.settings },
          },
          {
            path: routeSegment(PATHS.settingsUsersAssign),
            element: (
              <RequirePermission permission={PermissionBits.SettingsUsersView}>
                <AssignUsersPage />
              </RequirePermission>
            ),
            handle: { title: 'Users & Child Users', navSection: NAV_SECTIONS.settings },
          },
          {
            path: routeSegment(PATHS.settingsRoles),
            element: (
              <RequirePermission permission={PermissionBits.SettingsRolesView}>
                <SettingsRolesPage />
              </RequirePermission>
            ),
            handle: { title: 'Roles', navSection: NAV_SECTIONS.settings },
          },
        ],
      },
    ],
  },
])

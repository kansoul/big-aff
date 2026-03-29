import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import { RequirePermission } from '@/app/router/RequirePermission'
import { ProtectedRoute } from '@/app/router/ProtectedRoute'
import { PermissionScope } from '@/constants/permissions'

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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
    ],
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <DashboardLayout />,
        children: [
          {
            path: 'dashboard',
            element: <DashboardPage />,
            handle: { title: 'Dashboard' },
          },
          {
            path: 'settings/roles',
            element: (
              <RequirePermission permission={PermissionScope.settings.roles.view}>
                <SettingsRolesPage />
              </RequirePermission>
            ),
            handle: { title: 'Roles' },
          },
        ],
      },
    ],
  },
])

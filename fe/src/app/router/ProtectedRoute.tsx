import { Navigate, Outlet } from 'react-router-dom'

import { PageLoader } from '@/components/common/PageLoader'
import { useAuthStore } from '@/hooks/useAuthStore'

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

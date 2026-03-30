import { Navigate, Outlet } from 'react-router-dom'

import { DocumentTitle } from '@/components/common/DocumentTitle'
import { PageLoader } from '@/components/common/PageLoader'
import { PATHS } from '@/constants/paths'
import { useAuthStore } from '@/hooks/useAuthStore'

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) {
    return (
      <>
        <DocumentTitle />
        <PageLoader />
      </>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={PATHS.login} replace />
  }

  return (
    <>
      <DocumentTitle />
      <Outlet />
    </>
  )
}

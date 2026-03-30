import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { PATHS } from '@/constants/paths'
import { hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'

export function RequirePermission({
  permission,
  children,
}: {
  permission: number
  children: ReactNode
}) {
  const user = useAuthStore((s) => s.user)
  if (!hasPermission(user?.permission_mask, permission)) {
    return <Navigate to={PATHS.dashboard} replace />
  }
  return <>{children}</>
}

import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'

export function RequirePermission({
  permission,
  children,
}: {
  permission: string
  children: ReactNode
}) {
  const user = useAuthStore((s) => s.user)
  if (!hasPermission(user?.permissions, permission)) {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

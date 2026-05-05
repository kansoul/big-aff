import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { PATHS } from '@/constants/paths'
import { useAuthStore } from '@/hooks/useAuthStore'

export function RequireMainSystemAdmin({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user)

  if (!user?.is_admin || !user?.is_main_system) {
    return <Navigate to={PATHS.dashboard} replace />
  }

  return <>{children}</>
}

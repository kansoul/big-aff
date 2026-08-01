import { Navigate } from 'react-router-dom'

import { NAVIGATION_ITEMS } from '@/constants/header'
import { hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'

export function DefaultRoute() {
  const user = useAuthStore((state) => state.user)

  for (const item of NAVIGATION_ITEMS) {
    if (item.href) {
      return <Navigate to={item.href} replace />
    }

    for (const subItem of item.items ?? []) {
      if (subItem.adminOnly && !user?.is_admin) continue
      if (subItem.mainSystemOnly && !user?.is_main_system) continue
      if (
        subItem.requiredPermission &&
        !hasPermission(user?.permissions, subItem.requiredPermission)
      ) {
        continue
      }

      return <Navigate to={subItem.href} replace />
    }
  }

  return (
    <div className="flex min-h-72 items-center justify-center px-6 text-center text-sm text-muted-foreground">
      Your account does not have access to any available frontend module.
    </div>
  )
}

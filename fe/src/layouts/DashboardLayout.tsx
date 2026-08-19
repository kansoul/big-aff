import { memo } from 'react'
import { Outlet, useNavigation } from 'react-router-dom'

import { AppSidebar } from '@/components/common/AppSidebar'

function NavigationProgress() {
  const { state } = useNavigation()
  if (state !== 'loading') return null
  return (
    <div className="fixed top-0 left-0 z-50 h-0.5 w-full overflow-hidden" aria-hidden>
      <div
        className="h-full w-1/4 bg-primary"
        style={{ animation: 'nav-progress 1.2s ease-in-out infinite' }}
      />
    </div>
  )
}

function DashboardLayoutInner() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <NavigationProgress />
      <AppSidebar />
      <main className="w-full min-w-0 flex-1 px-2 py-4 pt-14 md:px-4 md:pt-4">
        <Outlet />
      </main>
    </div>
  )
}

export const DashboardLayout = memo(DashboardLayoutInner)

import { memo } from 'react'
import { Outlet, useNavigation } from 'react-router-dom'

import { Header } from '@/components/common/Header'
import { ScreenTitle } from '@/components/common/ScreenTitle'

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
    <div className="min-h-screen bg-background text-foreground">
      <NavigationProgress />
      <Header />
      <main className="w-full px-2 md:px-4 py-4">
        <ScreenTitle />
        <Outlet />
      </main>
    </div>
  )
}

export const DashboardLayout = memo(DashboardLayoutInner)

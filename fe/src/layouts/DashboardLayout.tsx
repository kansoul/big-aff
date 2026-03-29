import { memo } from 'react'
import { Outlet } from 'react-router-dom'

import { Header } from '@/components/common/Header'
import { ScreenTitle } from '@/components/common/ScreenTitle'

function DashboardLayoutInner() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="w-full px-4 md:px-8 py-4">
        <ScreenTitle />
        <Outlet />
      </main>
    </div>
  )
}

export const DashboardLayout = memo(DashboardLayoutInner)

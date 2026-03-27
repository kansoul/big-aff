import { useNavigate } from 'react-router-dom'
import { LogOut, User as UserIcon } from 'lucide-react'

import { ThemeToggle } from '@/components/common/ThemeToggle'
import { dashboardApi } from '@/features/dashboard/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/hooks/useAuthStore'

export function DashboardPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await dashboardApi.logout()
    } catch (err) {
      console.error('Logout failed', err)
    } finally {
      // Always cleanup local state
      logout()
      await navigate('/login')
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between rounded-lg border bg-card p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Welcome to your internal portal.</p>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="outline"
              onClick={() => {
                void handleLogout()
              }}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 flex items-center gap-2 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </header>

        <Card className="shadow-sm">
          <CardHeader className="rounded-t-lg border-b">
            <CardTitle className="text-xl flex items-center gap-2">
              <UserIcon className="text-primary h-5 w-5" />
              User Profile
            </CardTitle>
            <CardDescription>Your authenticated session details</CardDescription>
          </CardHeader>
          <CardContent className="rounded-b-lg p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="bg-muted/40 border-border sm:col-span-1 rounded-md border p-4">
                <dt className="text-muted-foreground text-sm font-medium">Full name</dt>
                <dd className="text-foreground mt-1 text-sm font-semibold">{user?.name}</dd>
              </div>
              <div className="bg-muted/40 border-border sm:col-span-1 rounded-md border p-4">
                <dt className="text-muted-foreground text-sm font-medium">Email address</dt>
                <dd className="text-foreground mt-1 text-sm font-semibold">{user?.email}</dd>
              </div>
              <div className="bg-muted/40 border-border sm:col-span-2 rounded-md border p-4">
                <dt className="text-muted-foreground text-sm font-medium">Account ID</dt>
                <dd className="text-foreground mt-1 font-mono text-sm">{user?.id}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { LogOut, User as UserIcon } from 'lucide-react'

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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">Welcome to your internal portal.</p>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              void handleLogout()
            }}
            className="flex items-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </header>

        <Card className="border-0 shadow-sm ring-1 ring-gray-100">
          <CardHeader className="bg-white rounded-t-lg border-b border-gray-100">
            <CardTitle className="text-xl flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-blue-600" />
              User Profile
            </CardTitle>
            <CardDescription>Your authenticated session details</CardDescription>
          </CardHeader>
          <CardContent className="bg-white rounded-b-lg p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-1 rounded-md bg-gray-50 p-4 border border-gray-100">
                <dt className="text-sm font-medium text-gray-500">Full name</dt>
                <dd className="mt-1 text-sm text-gray-900 font-semibold">{user?.name}</dd>
              </div>
              <div className="sm:col-span-1 rounded-md bg-gray-50 p-4 border border-gray-100">
                <dt className="text-sm font-medium text-gray-500">Email address</dt>
                <dd className="mt-1 text-sm text-gray-900 font-semibold">{user?.email}</dd>
              </div>
              <div className="sm:col-span-2 rounded-md bg-gray-50 p-4 border border-gray-100">
                <dt className="text-sm font-medium text-gray-500">Account ID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{user?.id}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

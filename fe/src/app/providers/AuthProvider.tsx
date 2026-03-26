import { useEffect } from 'react'
import type { ReactNode } from 'react'

import { dashboardApi } from '@/features/dashboard/api'
import { useAuthStore } from '@/hooks/useAuthStore'

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setLoading, logout } = useAuthStore()

  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true)
        const user = await dashboardApi.getMe()
        setUser(user)
      } catch {
        logout()
      } finally {
        setLoading(false)
      }
    }

    void initAuth()

    const handleUnauthorized = () => {
      logout()
    }

    window.addEventListener('unauthorized', handleUnauthorized)

    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized)
    }
  }, [setUser, setLoading, logout])

  return <>{children}</>
}

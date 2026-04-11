import { useEffect } from 'react'
import type { ReactNode } from 'react'

import { dashboardApi } from '@/features/dashboard/api'
import { useAuthStore } from '@/hooks/useAuthStore'
import { PATHS } from '@/constants/paths'

export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true)

        if (window.location.pathname === PATHS.login) {
          return
        }

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

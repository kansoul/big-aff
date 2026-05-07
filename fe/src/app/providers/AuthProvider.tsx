import { useEffect } from 'react'
import type { ReactNode } from 'react'

import { dashboardApi } from '@/features/dashboard/api'
import { loginApi } from '@/features/auth/api'
import { useAuthStore } from '@/hooks/useAuthStore'
import { useSessionStore } from '@/hooks/useSessionStore'
import { PATHS } from '@/constants/paths'

export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser)
  const setLoading = useAuthStore((s) => s.setLoading)
  const logout = useAuthStore((s) => s.logout)

  const activeUserId = useSessionStore((s) => s.activeUserId)
  const removeSession = useSessionStore((s) => s.removeSession)
  const sessions = useSessionStore((s) => s.sessions)

  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true)

        if (window.location.pathname === PATHS.login) {
          return
        }

        if (activeUserId === null || !sessions[activeUserId]) {
          logout()
          return
        }

        const user = await dashboardApi.getMe()
        setUser(user)
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status !== 401) {
          logout()
        }
      } finally {
        setLoading(false)
      }
    }

    void initAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handleUnauthorized = () => {
      if (activeUserId !== null) {
        removeSession(activeUserId)
      }

      const remainingIds = Object.keys(useSessionStore.getState().sessions).map(Number)
      if (remainingIds.length > 0) {
        const nextId = remainingIds[0]
        const nextSession = useSessionStore.getState().sessions[nextId]
        if (nextSession) {
          // Sync the server-side session cookie to the next account before navigating.
          loginApi
            .switchAccount(nextSession.token)
            .then((user) => {
              setUser(user)
              window.location.href = PATHS.dashboard
            })
            .catch(() => {
              logout()
              window.location.href = PATHS.login
            })
        }
      } else {
        logout()
        window.location.href = PATHS.login
      }
    }

    window.addEventListener('unauthorized', handleUnauthorized)
    return () => window.removeEventListener('unauthorized', handleUnauthorized)
  }, [activeUserId, removeSession, setUser, logout])

  return <>{children}</>
}

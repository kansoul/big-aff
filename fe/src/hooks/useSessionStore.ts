import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { User } from '@/shared/types'

export interface Session {
  user: User
  token: string
}

interface SessionStore {
  sessions: Record<number, Session>
  activeUserId: number | null
  addSession: (user: User, token: string) => void
  removeSession: (userId: number) => void
  switchTo: (userId: number) => void
  updateSessionUser: (user: User) => void
  getActiveSession: () => Session | null
  getActiveToken: () => string | null
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessions: {},
      activeUserId: null,

      addSession: (user, token) =>
        set((s) => ({
          sessions: { ...s.sessions, [user.id]: { user, token } },
          activeUserId: user.id,
        })),

      removeSession: (userId) =>
        set((s) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { [userId]: _removed, ...rest } = s.sessions
          const remainingIds = Object.keys(rest).map(Number)
          const newActiveId = s.activeUserId === userId ? (remainingIds[0] ?? null) : s.activeUserId
          return { sessions: rest, activeUserId: newActiveId }
        }),

      switchTo: (userId) => set({ activeUserId: userId }),

      updateSessionUser: (user) =>
        set((s) => {
          const existing = s.sessions[user.id]
          if (!existing) return s
          return { sessions: { ...s.sessions, [user.id]: { ...existing, user } } }
        }),

      getActiveSession: () => {
        const { sessions, activeUserId } = get()
        if (activeUserId === null) return null
        return sessions[activeUserId] ?? null
      },

      getActiveToken: () => {
        const session = get().getActiveSession()
        return session?.token ?? null
      },
    }),
    { name: 'multi-session' },
  ),
)

import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, LogOut, Plus, UserRound } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { loginApi } from '@/features/auth/api'
import { dashboardApi } from '@/features/dashboard/api'
import { useAuthStore } from '@/hooks/useAuthStore'
import { useSessionStore } from '@/hooks/useSessionStore'
import { PATHS } from '@/constants/paths'
import type { User } from '@/shared/types'

export const AccountSwitcher = React.memo(function AccountSwitcher() {
  const navigate = useNavigate()
  const [addOpen, setAddOpen] = React.useState(false)

  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)

  const sessions = useSessionStore((s) => s.sessions)
  const activeUserId = useSessionStore((s) => s.activeUserId)
  const addSession = useSessionStore((s) => s.addSession)
  const removeSession = useSessionStore((s) => s.removeSession)
  const switchTo = useSessionStore((s) => s.switchTo)

  const sessionList = Object.values(sessions)

  const handleSwitch = React.useCallback(
    async (userId: number) => {
      if (userId === activeUserId) return
      const session = sessions[userId]
      if (!session) return
      try {
        // Call BE to swap the session cookie to the target user.
        // After this the browser's laravel_session cookie points to userId.
        const user = await loginApi.switchAccount(session.token)
        switchTo(userId)
        setUser(user)
        window.dispatchEvent(new Event('account-switched'))
        void navigate(PATHS.dashboard)
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 401 || status === 403) {
          removeSession(userId)
        }
      }
    },
    [activeUserId, sessions, switchTo, setUser, navigate, removeSession],
  )

  const handleLogout = React.useCallback(async () => {
    try {
      await dashboardApi.logout()
    } catch {
      // token already expired — proceed anyway
    }
    if (activeUserId !== null) {
      removeSession(activeUserId)
    }
    const remaining = Object.values(useSessionStore.getState().sessions)
    if (remaining.length > 0) {
      setUser(remaining[0].user)
      void navigate(PATHS.dashboard)
    } else {
      logout()
      void navigate(PATHS.login)
    }
  }, [activeUserId, removeSession, setUser, logout, navigate])

  const handleAddSuccess = React.useCallback(
    (newUser: User, token: string) => {
      // Always upsert — if the account already existed, this refreshes its token.
      addSession(newUser, token)
      setUser(newUser)
      setAddOpen(false)
      void navigate(PATHS.dashboard)
    },
    [addSession, setUser, navigate],
  )

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarFallback>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          {sessionList.length > 1 && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 py-1.5">
                Accounts
              </DropdownMenuLabel>
              {sessionList.map((session) => {
                const isActive = session.user.id === activeUserId
                return (
                  <DropdownMenuItem
                    key={session.user.id}
                    onClick={() => void handleSwitch(session.user.id)}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-xs">
                        {session.user.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{session.user.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {session.user.email}
                      </span>
                    </div>
                    {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuSeparator />
            </>
          )}

          {sessionList.length === 1 && (
            <>
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1 p-1">
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                  </div>
                  <p className="text-xs leading-none text-muted-foreground pl-6">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add account</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => void handleLogout()}
            className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add account</DialogTitle>
            <DialogDescription>
              Login with another account to switch between them without re-entering credentials.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <LoginForm onSuccess={handleAddSuccess} submitLabel="Add account" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

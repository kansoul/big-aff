import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Check, ImagePlus, Loader2, LogOut, Plus } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { loginApi } from '@/features/auth/api'
import { useAuthStore } from '@/hooks/useAuthStore'
import { useSessionStore } from '@/hooks/useSessionStore'
import { PATHS } from '@/constants/paths'
import type { User } from '@/shared/types'

export const AccountSwitcher = React.memo(function AccountSwitcher() {
  const navigate = useNavigate()
  const [addOpen, setAddOpen] = React.useState(false)
  const [avatarOpen, setAvatarOpen] = React.useState(false)
  const [avatarUploading, setAvatarUploading] = React.useState(false)
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [pendingFile, setPendingFile] = React.useState<File | null>(null)

  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)

  const sessions = useSessionStore((s) => s.sessions)
  const activeUserId = useSessionStore((s) => s.activeUserId)
  const addSession = useSessionStore((s) => s.addSession)
  const removeSession = useSessionStore((s) => s.removeSession)
  const switchTo = useSessionStore((s) => s.switchTo)
  const updateSessionUser = useSessionStore((s) => s.updateSessionUser)

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
        void navigate(PATHS.root)
        window.location.reload()
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
      await loginApi.logout()
    } catch {
      // token already expired — proceed anyway
    }
    if (activeUserId !== null) {
      removeSession(activeUserId)
    }
    const remaining = Object.values(useSessionStore.getState().sessions)
    if (remaining.length > 0) {
      setUser(remaining[0].user)
      void navigate(PATHS.root)
    } else {
      logout()
      void navigate(PATHS.login)
    }
  }, [activeUserId, removeSession, setUser, logout, navigate])

  const handleAvatarSelect = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(file))
      setPendingFile(file)
      e.target.value = ''
    },
    [previewUrl],
  )

  const handleAvatarUpload = React.useCallback(async () => {
    if (!pendingFile) return
    setAvatarUploading(true)
    try {
      const updatedUser = await loginApi.uploadAvatar(pendingFile)
      setUser(updatedUser)
      updateSessionUser(updatedUser)
      setPreviewUrl(null)
      setPendingFile(null)
      setAvatarOpen(false)
    } finally {
      setAvatarUploading(false)
    }
  }, [pendingFile, setUser, updateSessionUser])

  const handleAvatarDialogChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
        setPendingFile(null)
      }
      setAvatarOpen(open)
    },
    [previewUrl],
  )

  const handleAddSuccess = React.useCallback(
    (newUser: User, token: string) => {
      // Always upsert — if the account already existed, this refreshes its token.
      addSession(newUser, token)
      setUser(newUser)
      setAddOpen(false)
      void navigate(PATHS.root)
    },
    [addSession, setUser, navigate],
  )

  const avatarInputRef = React.useRef<HTMLInputElement>(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-primary/30 transition-all">
            {user?.avatar_url && <AvatarImage src={user.avatar_url} alt={user.name} />}
            <AvatarFallback>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-72 p-0 overflow-hidden">
          {/* Profile header */}
          <div className="bg-muted/40 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate text-sm font-semibold leading-tight">{user?.name}</p>
                <p className="truncate text-xs text-muted-foreground leading-tight">
                  {user?.email}
                </p>
                <button
                  type="button"
                  onClick={() => setAvatarOpen(true)}
                  className="mt-1 cursor-pointer flex items-center gap-1 self-start text-xs text-primary transition-colors hover:text-primary/70"
                >
                  <ImagePlus className="h-3 w-3" />
                  Change avatar
                </button>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator className="my-0" />

          {/* Other sessions */}
          {sessionList.length > 1 && (
            <>
              <p className="px-3 pt-2.5 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Switch account
              </p>
              <div className="px-1 pb-1 gap-1 grid">
                {sessionList.map((session) => {
                  const isActive = session.user.id === activeUserId
                  return (
                    <DropdownMenuItem
                      key={session.user.id}
                      onClick={() => void handleSwitch(session.user.id)}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2${isActive ? ' bg-accent' : ''}`}
                    >
                      <Avatar className="h-8 w-8 shrink-0 ring-1 ring-border">
                        {session.user.avatar_url && (
                          <AvatarImage src={session.user.avatar_url} alt={session.user.name} />
                        )}
                        <AvatarFallback className="text-xs font-medium">
                          {session.user.name?.charAt(0)?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className={`truncate text-sm${isActive ? ' font-semibold' : ''}`}>
                          {session.user.name}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {session.user.email}
                        </span>
                      </div>
                      {isActive && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    </DropdownMenuItem>
                  )
                })}
              </div>
              <DropdownMenuSeparator className="my-0" />
            </>
          )}

          {/* Add account */}
          <div className="px-1 py-1">
            <DropdownMenuItem
              onClick={() => setAddOpen(true)}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40">
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <span className="text-sm">Add account</span>
            </DropdownMenuItem>
          </div>

          <DropdownMenuSeparator className="my-0" />

          {/* Log out */}
          <div className="px-1 py-1">
            <DropdownMenuItem
              onClick={() => void handleLogout()}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Log out</span>
            </DropdownMenuItem>
          </div>
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

      <Dialog open={avatarOpen} onOpenChange={handleAvatarDialogChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change avatar</DialogTitle>
            <DialogDescription>JPG, PNG, GIF, WebP — tối đa 5 MB.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-5 py-2">
            {/* Avatar preview — shows selected image or current avatar */}
            <div className="relative">
              <Avatar className="h-28 w-28 ring-2 ring-border">
                {(previewUrl || user?.avatar_url) && (
                  <AvatarImage
                    src={previewUrl ?? user!.avatar_url!}
                    alt={user?.name}
                    className={previewUrl ? 'object-cover' : ''}
                  />
                )}
                <AvatarFallback className="text-4xl">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {previewUrl && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground whitespace-nowrap">
                  Preview
                </span>
              )}
            </div>

            <div className="flex flex-col items-center gap-0.5 text-center">
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              disabled={avatarUploading}
              onChange={handleAvatarSelect}
            />

            <div className="flex items-center gap-2">
              {/* Select / re-select button */}
              <button
                type="button"
                disabled={avatarUploading}
                onClick={() => avatarInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
                {previewUrl ? 'Chọn lại' : 'Chọn ảnh'}
              </button>

              {/* Confirm upload — only visible when a file is selected */}
              {pendingFile && (
                <button
                  type="button"
                  disabled={avatarUploading}
                  onClick={() => void handleAvatarUpload()}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                >
                  {avatarUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải lên…
                    </>
                  ) : (
                    'Xác nhận'
                  )}
                </button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

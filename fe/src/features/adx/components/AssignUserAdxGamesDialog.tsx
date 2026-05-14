import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Gamepad2, Loader2, Save, Search, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { adxApi } from '@/features/adx/api'
import type { AdxAssignedGameSummary, AdxGame, AdxUserWithGames } from '@/features/adx/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { cn } from '@/lib/utils'
import { formatApiError } from '@/features/settings/components'

const USERS_PAGE_SIZE = 100
const GAMES_PAGE_SIZE = 500

type AssignUserAdxGamesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type AdxGameIdsPickerProps = {
  disabled?: boolean
  games: AdxGame[]
  value: number[]
  onChange: (next: number[]) => void
}

function toUniqueSortedGameIds(gameIds: number[]): number[] {
  return Array.from(new Set(gameIds.map((id) => Number(id)).filter((id) => id > 0))).sort(
    (a, b) => a - b,
  )
}

function assignedIdsFromRow(row: AdxUserWithGames): number[] {
  return toUniqueSortedGameIds(row.games.map((game) => game.id))
}

function savedByUserFromRows(rows: AdxUserWithGames[]): Record<number, number[]> {
  return Object.fromEntries(rows.map((row) => [row.id, assignedIdsFromRow(row)]))
}

function draftsFromSaved(savedByUserId: Record<number, number[]>): Record<number, number[]> {
  return Object.fromEntries(
    Object.entries(savedByUserId).map(([userId, ids]) => [Number(userId), [...ids]]),
  )
}

function hasSelectionDiff(left: number[], right: number[]): boolean {
  if (left.length !== right.length) return true
  return left.some((id) => !right.includes(id)) || right.some((id) => !left.includes(id))
}

function gameLabel(game: AdxAssignedGameSummary): string {
  return `${game.name} (${game.slug})`
}

const AdxGameIdsPicker = memo(function AdxGameIdsPicker({
  disabled,
  games,
  value,
  onChange,
}: AdxGameIdsPickerProps) {
  const selected = useMemo(() => new Set(value), [value])

  const toggle = useCallback(
    (gameId: number, checked: boolean) => {
      const next = checked ? [...value, gameId] : value.filter((id) => id !== gameId)
      onChange(toUniqueSortedGameIds(next))
    },
    [onChange, value],
  )

  if (games.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
        No games available
      </div>
    )
  }

  return (
    <div className="grid max-h-48 gap-1.5 overflow-y-auto rounded-lg border border-input bg-background p-2">
      {games.map((game) => {
        const checked = selected.has(game.id)
        return (
          <label
            key={game.id}
            className={cn(
              'flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
              checked ? 'bg-primary/10 text-foreground' : 'hover:bg-muted/70',
              disabled && 'pointer-events-none opacity-50',
            )}
          >
            <Checkbox
              checked={checked}
              disabled={disabled}
              onCheckedChange={(next) => toggle(game.id, Boolean(next))}
              className="mt-0.5"
            />
            <span className="min-w-0">
              <span className="block truncate font-medium">{game.name}</span>
              <span className="block truncate font-mono text-[11px] text-muted-foreground">
                {game.slug}
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
})

export function AssignUserAdxGamesDialog({ open, onOpenChange }: AssignUserAdxGamesDialogProps) {
  const user = useAuthStore((s) => s.user)
  const authUserId = user?.id ?? -1
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions])
  const canAssign = useMemo(
    () => hasPermission(permissions, PermissionSlugs.AdxGamesAssign),
    [permissions],
  )

  const [users, setUsers] = useState<AdxUserWithGames[]>([])
  const [games, setGames] = useState<AdxGame[]>([])
  const [savedByUserId, setSavedByUserId] = useState<Record<number, number[]>>({})
  const [drafts, setDrafts] = useState<Record<number, number[]>>({})
  const [loading, setLoading] = useState(false)
  const [savingRowId, setSavingRowId] = useState<number | null>(null)
  const [flashError, setFlashError] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('')

  const fetchUsers = useCallback(async () => {
    const firstPage = await adxApi.listUsersWithGames({
      page: 1,
      per_page: USERS_PAGE_SIZE,
      order_by: 'id',
      order: 'desc',
    })
    const lastPage = Math.max(firstPage.data.pagination.last_page ?? 1, 1)

    let allRows = firstPage.data.data
    if (lastPage > 1) {
      const extraPages = await Promise.all(
        Array.from({ length: lastPage - 1 }, (_, index) =>
          adxApi.listUsersWithGames({
            page: index + 2,
            per_page: USERS_PAGE_SIZE,
            order_by: 'id',
            order: 'desc',
          }),
        ),
      )
      allRows = allRows.concat(extraPages.flatMap((page) => page.data.data))
    }

    return allRows
  }, [])

  const fetchGames = useCallback(async () => {
    const firstPage = await adxApi.listGames({
      page: 1,
      per_page: GAMES_PAGE_SIZE,
      order_by: 'sort_order',
      order: 'asc',
    })
    const lastPage = Math.max(firstPage.data.pagination.last_page ?? 1, 1)

    let allRows = firstPage.data.data
    if (lastPage > 1) {
      const extraPages = await Promise.all(
        Array.from({ length: lastPage - 1 }, (_, index) =>
          adxApi.listGames({
            page: index + 2,
            per_page: GAMES_PAGE_SIZE,
            order_by: 'sort_order',
            order: 'asc',
          }),
        ),
      )
      allRows = allRows.concat(extraPages.flatMap((page) => page.data.data))
    }

    return allRows
  }, [])

  const applyUserRows = useCallback((rows: AdxUserWithGames[]) => {
    const saved = savedByUserFromRows(rows)
    setUsers(rows)
    setSavedByUserId(saved)
    setDrafts(draftsFromSaved(saved))
  }, [])

  useEffect(() => {
    if (!open) return
    let ignore = false

    const load = async () => {
      try {
        setFlashError(null)
        setLoading(true)
        const [userRows, gameRows] = await Promise.all([fetchUsers(), fetchGames()])
        if (ignore) return
        setGames(gameRows)
        applyUserRows(userRows)
      } catch (err) {
        if (!ignore) toast.error(formatApiError(err))
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    void load()
    return () => {
      ignore = true
    }
  }, [open, applyUserRows, fetchGames, fetchUsers])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUserSearch(userSearch), 400)
    return () => clearTimeout(timer)
  }, [userSearch])

  const onDraftChange = useCallback((userId: number, gameIds: number[]) => {
    setDrafts((current) => ({ ...current, [userId]: toUniqueSortedGameIds(gameIds) }))
  }, [])

  const saveRowAsync = useCallback(
    async (userId: number) => {
      const gameIds = drafts[userId] ?? savedByUserId[userId] ?? []
      try {
        setFlashError(null)
        setSavingRowId(userId)
        const result = await adxApi.assignGamesToUser(userId, gameIds)
        const rows = await fetchUsers()
        applyUserRows(rows)

        const skipped = result.data.skipped_game_ids ?? []
        if (skipped.length > 0) {
          toast.warning(`Skipped ${skipped.length} game(s): ${skipped.join(', ')}`, {
            duration: 8000,
          })
        } else {
          toast.success('Assigned AdX games successfully')
        }
      } catch (err) {
        setFlashError(formatApiError(err))
      } finally {
        setSavingRowId(null)
      }
    },
    [applyUserRows, drafts, fetchUsers, savedByUserId],
  )

  const searchQuery = debouncedUserSearch.trim().toLowerCase()
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users
    return users.filter(
      (row) =>
        row.name.toLowerCase().includes(searchQuery) ||
        row.email.toLowerCase().includes(searchQuery),
    )
  }, [searchQuery, users])

  const emptyMessage = searchQuery ? 'No users found' : 'No users to assign'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-[96vw]! flex-col gap-0 overflow-hidden p-0 md:max-w-[90vw]! xl:max-w-[1280px]!">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Assign AdX Games to Users</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-auto px-4 py-4 sm:px-6">
          <p className="text-sm text-muted-foreground">
            Select games for each user, then save the user row to apply changes.
          </p>

          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search user by name or email..."
              className="pl-9"
              autoComplete="off"
            />
          </div>

          {flashError ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <p>{flashError}</p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-14 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span>Loading...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card px-5 py-14 text-center">
                <Users className="size-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
              </div>
            ) : (
              filteredUsers.map((row) => {
                const isAuthUser = row.id === authUserId
                const saved = savedByUserId[row.id] ?? []
                const draft = drafts[row.id] ?? saved
                const dirty = hasSelectionDiff(draft, saved)
                const isSaving = savingRowId === row.id
                const rowDisabled = !canAssign || isAuthUser

                return (
                  <div
                    key={row.id}
                    className={cn(
                      'rounded-xl border bg-card px-4 py-4 shadow-sm transition-[border-color] sm:px-5 sm:py-5',
                      dirty ? 'border-primary/40' : 'border-border',
                      isAuthUser && 'opacity-60',
                    )}
                  >
                    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(180px,1.1fr)_minmax(260px,1.8fr)_minmax(360px,2.2fr)] lg:gap-8">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-muted-foreground">User</p>
                        <p className="mt-1.5 truncate text-sm font-semibold text-foreground">
                          {row.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="text-[11px] font-semibold text-muted-foreground">
                            Assigned Games
                          </p>
                          {row.games.length > 0 ? (
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                              {row.games.length}
                            </span>
                          ) : null}
                        </div>
                        {row.games.length > 0 ? (
                          <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
                            {row.games.map((game) => {
                              const label = gameLabel(game)
                              return (
                                <Badge
                                  key={game.id}
                                  variant="outline"
                                  className="h-auto max-w-full justify-start rounded-md px-2 py-1 text-[11px] leading-tight"
                                  title={label}
                                >
                                  <span className="max-w-[240px] truncate">{label}</span>
                                </Badge>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-muted-foreground">No assigned games</p>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="text-[11px] font-semibold text-muted-foreground">Edit</p>
                          {draft.length > 0 ? (
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                              {draft.length}
                            </span>
                          ) : null}
                          {dirty ? (
                            <span className="ml-auto text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              Unsaved changes
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1.5 space-y-2.5">
                          <AdxGameIdsPicker
                            disabled={rowDisabled}
                            games={games}
                            value={draft}
                            onChange={(next) => onDraftChange(row.id, next)}
                          />
                          {canAssign && !isAuthUser ? (
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant={dirty ? 'default' : 'secondary'}
                                className="gap-1.5 font-medium"
                                disabled={!dirty || savingRowId !== null}
                                onClick={() => void saveRowAsync(row.id)}
                              >
                                {isSaving ? (
                                  <>
                                    <Loader2 className="size-3.5 animate-spin" />
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Save className="size-3.5" />
                                    Save
                                  </>
                                )}
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="flex justify-between border-t px-6 py-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Gamepad2 className="size-3.5" />
            <span>{games.length} available game(s)</span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

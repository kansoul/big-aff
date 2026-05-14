import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Loader2, Save, Search, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { adxApi } from '@/features/adx/api'
import type { AdxAssignedAccountSummary, AdxUserWithAccounts } from '@/features/adx/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { cn } from '@/lib/utils'
import { formatApiError } from '@/features/settings/components'

const USERS_PAGE_SIZE = 100

type AssignUserAdxAccountsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type AdxAccountIdsPickerProps = {
  disabled?: boolean
  value: string[]
  onChange: (next: string[]) => void
}

function toUniqueSortedAccountIds(accountIds: string[]): string[] {
  return Array.from(new Set(accountIds.map((id) => id.trim()).filter(Boolean))).sort()
}

function accountIdsToText(accountIds: string[]): string {
  return accountIds.join('\n')
}

function textToAccountIds(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function accountLabel(account: AdxAssignedAccountSummary): string {
  const name = account.account_name
    ? `${account.account_name} (${account.account_id})`
    : account.account_id
  return `${name} · ${account.source}`
}

function assignedIdsFromRow(row: AdxUserWithAccounts): string[] {
  return toUniqueSortedAccountIds(row.accounts.map((account) => account.account_id))
}

function savedByUserFromRows(rows: AdxUserWithAccounts[]): Record<number, string[]> {
  return Object.fromEntries(rows.map((row) => [row.id, assignedIdsFromRow(row)]))
}

function draftsFromSaved(savedByUserId: Record<number, string[]>): Record<number, string[]> {
  return Object.fromEntries(
    Object.entries(savedByUserId).map(([userId, ids]) => [Number(userId), [...ids]]),
  )
}

function hasSelectionDiff(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return true
  return left.some((id) => !right.includes(id)) || right.some((id) => !left.includes(id))
}

const AdxAccountIdsPicker = memo(function AdxAccountIdsPicker({
  disabled,
  value,
  onChange,
}: AdxAccountIdsPickerProps) {
  const [focusedText, setFocusedText] = useState<string | null>(null)
  const text = focusedText ?? accountIdsToText(value)

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const raw = event.target.value
      setFocusedText(raw)
      onChange(textToAccountIds(raw))
    },
    [onChange],
  )

  const handleBlur = useCallback(() => {
    setFocusedText(null)
  }, [])

  const handleFocus = useCallback(() => {
    setFocusedText(accountIdsToText(value))
  }, [value])

  return (
    <textarea
      disabled={disabled}
      value={text}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder="Enter AdX account IDs, one per line..."
      rows={5}
      className={cn(
        'w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm shadow-xs',
        'placeholder:text-muted-foreground',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        'transition-[color,box-shadow]',
      )}
    />
  )
})

export function AssignUserAdxAccountsDialog({
  open,
  onOpenChange,
}: AssignUserAdxAccountsDialogProps) {
  const user = useAuthStore((s) => s.user)
  const authUserId = user?.id ?? -1
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions])
  const canAssign = useMemo(
    () => hasPermission(permissions, PermissionSlugs.AdxAccountsAssign),
    [permissions],
  )

  const [users, setUsers] = useState<AdxUserWithAccounts[]>([])
  const [savedByUserId, setSavedByUserId] = useState<Record<number, string[]>>({})
  const [drafts, setDrafts] = useState<Record<number, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [savingRowId, setSavingRowId] = useState<number | null>(null)
  const [flashError, setFlashError] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('')

  const fetchAll = useCallback(async () => {
    const firstPage = await adxApi.listUsersWithAccounts({
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
          adxApi.listUsersWithAccounts({
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

  const applyUserRows = useCallback((rows: AdxUserWithAccounts[]) => {
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
        const rows = await fetchAll()
        if (ignore) return
        applyUserRows(rows)
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
  }, [open, applyUserRows, fetchAll])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUserSearch(userSearch), 400)
    return () => clearTimeout(timer)
  }, [userSearch])

  const onDraftChange = useCallback((userId: number, accountIds: string[]) => {
    setDrafts((current) => ({ ...current, [userId]: toUniqueSortedAccountIds(accountIds) }))
  }, [])

  const saveRowAsync = useCallback(
    async (userId: number) => {
      const accountIds = drafts[userId] ?? savedByUserId[userId] ?? []
      try {
        setFlashError(null)
        setSavingRowId(userId)
        const result = await adxApi.assignAccountsToUser(userId, accountIds)
        const rows = await fetchAll()
        applyUserRows(rows)

        const skipped = result.data.skipped_account_ids ?? []
        if (skipped.length > 0) {
          toast.warning(`Skipped ${skipped.length} account(s): ${skipped.join(', ')}`, {
            duration: 8000,
          })
        } else {
          toast.success('Assigned AdX accounts successfully')
        }
      } catch (err) {
        setFlashError(formatApiError(err))
      } finally {
        setSavingRowId(null)
      }
    },
    [applyUserRows, drafts, fetchAll, savedByUserId],
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
          <DialogTitle>Assign AdX Accounts to Users</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-auto px-4 py-4 sm:px-6">
          <p className="text-sm text-muted-foreground">
            Enter AdX account IDs one per line, then save the user row to apply changes.
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
                            Assigned AdX Accounts
                          </p>
                          {row.accounts.length > 0 ? (
                            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                              {row.accounts.length}
                            </span>
                          ) : null}
                        </div>
                        {row.accounts.length > 0 ? (
                          <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
                            {row.accounts.map((account) => {
                              const label = accountLabel(account)
                              return (
                                <Badge
                                  key={`${account.source}-${account.account_id}`}
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
                          <p className="mt-2 text-xs text-muted-foreground">No assigned accounts</p>
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
                          <AdxAccountIdsPicker
                            disabled={rowDisabled}
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

        <div className="flex justify-end border-t px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Search } from 'lucide-react'
import { toast } from 'sonner'

import { accountsApi } from '@/features/accounts/api'
import { AssignUserAccountsTableCard } from '@/features/accounts/components/AssignUserAccountsTableCard'

import { formatApiError } from '@/features/settings/components'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { AssignedAccountSummary, UserWithAccounts } from '../types/userAccountAssignments'

const USERS_PAGE_SIZE = 100

function toUniqueSortedAccountIds(accountIds: string[]): string[] {
  return Array.from(new Set(accountIds.map((id) => id.trim()).filter(Boolean))).sort()
}

function normalizeAssignedAccounts(
  accounts: UserWithAccounts['accounts'],
): AssignedAccountSummary[] {
  return accounts
    .map((account) => {
      const id = Number(account.id)
      if (!Number.isInteger(id)) return null
      const rawAccountId = typeof account.account_id === 'string' ? account.account_id.trim() : ''
      return {
        id,
        account_id: rawAccountId.length > 0 ? rawAccountId : String(id),
        account_name: typeof account.account_name === 'string' ? account.account_name : null,
      } satisfies AssignedAccountSummary
    })
    .filter((a): a is AssignedAccountSummary => a !== null)
}

function toUserRows(raw: UserWithAccounts[]): UserWithAccounts[] {
  return raw.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    accounts: normalizeAssignedAccounts(u.accounts),
  }))
}

function assignedIdsFromRow(row: UserWithAccounts): string[] {
  return toUniqueSortedAccountIds(row.accounts.map((a) => a.account_id).filter(Boolean))
}

function savedByUserFromRows(rows: UserWithAccounts[]): Record<number, string[]> {
  return Object.fromEntries(rows.map((row) => [row.id, assignedIdsFromRow(row)]))
}

function draftsFromSaved(savedByUserId: Record<number, string[]>): Record<number, string[]> {
  return Object.fromEntries(
    Object.entries(savedByUserId).map(([userId, ids]) => [Number(userId), [...ids]]),
  )
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssignUserAccountsDialog({ open, onOpenChange }: Props) {
  const user = useAuthStore((s) => s.user)
  const authUserId = user?.id ?? -1
  const perms = user?.permissions ?? []
  const canAssign = hasPermission(perms, PermissionSlugs.AccountsAssign)

  const [users, setUsers] = useState<UserWithAccounts[]>([])
  const [savedByUserId, setSavedByUserId] = useState<Record<number, string[]>>({})
  const [drafts, setDrafts] = useState<Record<number, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [savingRowId, setSavingRowId] = useState<number | null>(null)
  const [flashError, setFlashError] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('')

  const fetchAll = useCallback(async () => {
    const firstPage = await accountsApi.listUsersWithAccounts({
      page: 1,
      per_page: USERS_PAGE_SIZE,
    })
    const lastPage = Math.max(firstPage.pagination.last_page ?? 1, 1)

    let allRaw = firstPage.data
    if (lastPage > 1) {
      const extraPages = await Promise.all(
        Array.from({ length: lastPage - 1 }, (_, i) =>
          accountsApi.listUsersWithAccounts({ page: i + 2, per_page: USERS_PAGE_SIZE }),
        ),
      )
      allRaw = allRaw.concat(extraPages.flatMap((p) => p.data))
    }

    return allRaw
  }, [])

  const applyUserRows = useCallback((raw: UserWithAccounts[]) => {
    const rows = toUserRows(raw)
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
        setLoading(true)
        const raw = await fetchAll()
        if (ignore) return
        applyUserRows(raw)
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
        const result = await accountsApi.assignToUser(userId, accountIds)

        const raw = await fetchAll()
        applyUserRows(raw)

        const skipped: string[] = result.skipped_account_ids ?? []
        if (skipped.length > 0) {
          toast.warning(
            `Skipped ${skipped.length} account(s) already assigned to another user: ${skipped.join(', ')}`,
            { duration: 8000 },
          )
        } else {
          toast.success('Assigned accounts successfully')
        }
      } catch (err) {
        setFlashError(formatApiError(err))
      } finally {
        setSavingRowId(null)
      }
    },
    [applyUserRows, drafts, fetchAll, savedByUserId],
  )

  const onSaveRow = useCallback(
    (userId: number) => {
      void saveRowAsync(userId)
    },
    [saveRowAsync],
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
          <DialogTitle>Assign Accounts to Users</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-auto px-4 py-4 sm:px-6">
          <p className="text-sm text-muted-foreground">
            Assign accounts to each user. Press{' '}
            <span className="font-medium text-foreground">Save</span> on a row to apply changes.
            Enter account IDs one per line. Each account can only be assigned to one user.
          </p>

          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search user by name or email…"
              className="pl-9"
              autoComplete="off"
            />
          </div>

          {flashError ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{flashError}</p>
            </div>
          ) : null}

          <AssignUserAccountsTableCard
            loading={loading}
            users={filteredUsers}
            drafts={drafts}
            savedByUserId={savedByUserId}
            onDraftChange={onDraftChange}
            onSaveRow={onSaveRow}
            savingRowId={savingRowId}
            canAssign={canAssign}
            authUserId={authUserId}
            emptyMessage={emptyMessage}
          />
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

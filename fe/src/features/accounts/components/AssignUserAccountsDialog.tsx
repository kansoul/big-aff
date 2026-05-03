import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Search } from 'lucide-react'
import { toast } from 'sonner'

import { accountsApi } from '@/features/accounts/api'
import type { AccountOptionForAssign } from '@/features/accounts/types'
import { AssignUserAccountsTableCard } from '@/features/accounts/components/AssignUserAccountsTableCard'

import { formatApiError } from '@/features/settings/components'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { AssignedAccountSummary, UserWithAccounts } from '../types/userAccountAssignments'

const USERS_PAGE_SIZE = 100

function toUniqueSortedIds(ids: number[]): number[] {
  return Array.from(new Set(ids)).sort((a, b) => a - b)
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

function assignedIdsFromRow(row: UserWithAccounts): number[] {
  return toUniqueSortedIds(
    row.accounts.map((a) => Number(a.id)).filter((id): id is number => Number.isInteger(id)),
  )
}

function savedByUserFromRows(rows: UserWithAccounts[]): Record<number, number[]> {
  return Object.fromEntries(rows.map((row) => [row.id, assignedIdsFromRow(row)]))
}

function draftsFromSaved(savedByUserId: Record<number, number[]>): Record<number, number[]> {
  return Object.fromEntries(
    Object.entries(savedByUserId).map(([userId, ids]) => [Number(userId), [...ids]]),
  )
}

/**
 * Account IDs claimed by OTHER editable users in the current draft state.
 * excludeUserId: the user whose dropdown we're rendering (skip their own draft)
 * authUserId: the auth user's row is disabled, so their draft doesn't "block" anyone
 */
function claimedByOthers(
  drafts: Record<number, number[]>,
  excludeUserId: number,
  authUserId: number,
): Set<number> {
  const claimed = new Set<number>()
  for (const [userIdStr, ids] of Object.entries(drafts)) {
    const uid = Number(userIdStr)
    if (uid !== excludeUserId && uid !== authUserId) ids.forEach((id) => claimed.add(id))
  }
  return claimed
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
  // Shared pool: unassigned or assigned to a specific user (fetched once, not per-user)
  const [assignOptionPool, setAssignOptionPool] = useState<AccountOptionForAssign[]>([])
  const [savedByUserId, setSavedByUserId] = useState<Record<number, number[]>>({})
  const [drafts, setDrafts] = useState<Record<number, number[]>>({})
  const [loading, setLoading] = useState(false)
  const [savingRowId, setSavingRowId] = useState<number | null>(null)
  const [flashError, setFlashError] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('')

  const fetchAll = useCallback(async () => {
    // Fetch all users (paginated) + shared assign pool in parallel
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
        // 2 calls total regardless of user count
        const [raw, pool] = await Promise.all([fetchAll(), accountsApi.assignOptions()])
        if (ignore) return
        applyUserRows(raw)
        setAssignOptionPool(pool)
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

  const onDraftChange = useCallback(
    (userId: number, accountIds: number[]) => {
      setDrafts((current) => {
        const claimed = claimedByOthers(current, userId, authUserId)
        const safe = toUniqueSortedIds(accountIds.filter((id) => !claimed.has(id)))
        return { ...current, [userId]: safe }
      })
    },
    [authUserId],
  )

  const saveRowAsync = useCallback(
    async (userId: number) => {
      const accountIds = drafts[userId] ?? savedByUserId[userId] ?? []
      try {
        setFlashError(null)
        setSavingRowId(userId)
        await accountsApi.assignToUser(userId, accountIds)

        // Refresh users + pool after save
        const [raw, pool] = await Promise.all([fetchAll(), accountsApi.assignOptions()])
        applyUserRows(raw)
        setAssignOptionPool(pool)

        toast.success('Assigned accounts successfully')
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

  // Per-user options: pool accounts not claimed by other editable users in draft
  const filteredOptionsByUser = useMemo(() => {
    const result: Record<number, AccountOptionForAssign[]> = {}
    for (const row of users) {
      const claimed = claimedByOthers(drafts, row.id, authUserId)
      result[row.id] = assignOptionPool.filter((opt) => !claimed.has(opt.id))
    }
    return result
  }, [users, assignOptionPool, drafts, authUserId])

  const emptyMessage = searchQuery ? 'No users found' : 'No users to assign'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-fit! flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Assign Accounts to Users</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Assign accounts to each user. Press{' '}
            <span className="font-medium text-foreground">Save</span> on a row to apply changes.
            Each account can only be assigned to one user.
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
            accountOptionsByUser={filteredOptionsByUser}
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

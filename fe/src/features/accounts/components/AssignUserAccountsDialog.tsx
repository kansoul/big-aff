import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Search } from 'lucide-react'
import { toast } from 'sonner'

import { accountsApi } from '@/features/accounts/api'
import type { AccountOptionForAssign, UserFilterParams } from '@/features/accounts/types'
import { AssignUserAccountsTableCard } from '@/features/accounts/components/AssignUserAccountsTableCard'
import { usersApi } from '@/features/users/api/users'

import { formatApiError } from '@/features/settings/components'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type {
  AssignedAccountSummary,
  UserAccountAssignmentRow,
} from '../types/userAccountAssignments'

const USER_LIST_PAGE_SIZE = 100
const USER_LIST_FILTERS: UserFilterParams = {
  order: 'asc',
  order_by: 'name',
}

function toUniqueSortedIds(ids: number[]): number[] {
  return Array.from(new Set(ids)).sort((a, b) => a - b)
}

type UserListRowWithAccounts = {
  id: number
  name: string
  email: string
  accounts?: Array<{
    id: number
    account_id?: string | null
    account_name?: string | null
  }>
}

function normalizeAssignedAccounts(
  accounts: UserListRowWithAccounts['accounts'],
): AssignedAccountSummary[] {
  if (!Array.isArray(accounts)) return []

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

function toUserAccountAssignmentRows(rows: UserListRowWithAccounts[]): UserAccountAssignmentRow[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    accounts: normalizeAssignedAccounts(row.accounts),
  }))
}

function assignedAccountIdsFromRow(row: UserAccountAssignmentRow): number[] {
  return toUniqueSortedIds(
    row.accounts.map((a) => Number(a.id)).filter((id): id is number => Number.isInteger(id)),
  )
}

function savedByUserFromRows(rows: UserAccountAssignmentRow[]): Record<number, number[]> {
  return Object.fromEntries(rows.map((row) => [row.id, assignedAccountIdsFromRow(row)]))
}

function draftsFromSaved(savedByUserId: Record<number, number[]>): Record<number, number[]> {
  return Object.fromEntries(
    Object.entries(savedByUserId).map(([userId, accountIds]) => [Number(userId), [...accountIds]]),
  )
}

/** Returns the set of account IDs claimed by OTHER users in the current draft state. */
function claimedByOthers(drafts: Record<number, number[]>, excludeUserId: number): Set<number> {
  const claimed = new Set<number>()
  for (const [userIdStr, ids] of Object.entries(drafts)) {
    if (Number(userIdStr) !== excludeUserId) {
      ids.forEach((id) => claimed.add(id))
    }
  }
  return claimed
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssignUserAccountsDialog({ open, onOpenChange }: Props) {
  const user = useAuthStore((s) => s.user)
  const perms = user?.permissions ?? []
  const canAssign = hasPermission(perms, PermissionSlugs.AccountsAssign)

  const [users, setUsers] = useState<UserAccountAssignmentRow[]>([])
  const [accountOptionsByUser, setAccountOptionsByUser] = useState<
    Record<number, AccountOptionForAssign[]>
  >({})
  const [savedByUserId, setSavedByUserId] = useState<Record<number, number[]>>({})
  const [drafts, setDrafts] = useState<Record<number, number[]>>({})
  const [loading, setLoading] = useState(false)
  const [savingRowId, setSavingRowId] = useState<number | null>(null)
  const [flashError, setFlashError] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('')

  const fetchUsers = useCallback(async () => {
    const firstPage = await usersApi.list(1, USER_LIST_PAGE_SIZE, USER_LIST_FILTERS)
    const firstRows = toUserAccountAssignmentRows(firstPage.data.data)
    const lastPage = Math.max(firstPage.data.pagination.last_page || 1, 1)

    if (lastPage === 1) return firstRows

    const extraRows: UserAccountAssignmentRow[] = []
    for (let page = 2; page <= lastPage; page += 1) {
      const response = await usersApi.list(page, USER_LIST_PAGE_SIZE, USER_LIST_FILTERS)
      extraRows.push(...toUserAccountAssignmentRows(response.data.data))
    }

    return [...firstRows, ...extraRows]
  }, [])

  const applyUserRows = useCallback((rows: UserAccountAssignmentRow[]) => {
    const saved = savedByUserFromRows(rows)
    setUsers(rows)
    setSavedByUserId(saved)
    setDrafts(draftsFromSaved(saved))
  }, [])

  useEffect(() => {
    if (!open) return
    let ignore = false

    const fetchData = async () => {
      try {
        setLoading(true)
        const userRows = await fetchUsers()
        if (ignore) return

        applyUserRows(userRows)

        const optionEntries = await Promise.all(
          userRows.map(async (row) => {
            const options = await accountsApi.listUserAssignOptions(row.id)
            return [row.id, options] as const
          }),
        )
        if (!ignore) {
          setAccountOptionsByUser(Object.fromEntries(optionEntries))
        }
      } catch (err) {
        if (!ignore) toast.error(formatApiError(err))
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    void fetchData()
    return () => {
      ignore = true
    }
  }, [open, applyUserRows, fetchUsers])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUserSearch(userSearch), 400)
    return () => clearTimeout(timer)
  }, [userSearch])

  const onDraftChange = useCallback((userId: number, accountIds: number[]) => {
    setDrafts((current) => {
      const claimed = claimedByOthers(current, userId)
      const safe = toUniqueSortedIds(accountIds.filter((id) => !claimed.has(id)))
      return { ...current, [userId]: safe }
    })
  }, [])

  const saveRowAsync = useCallback(
    async (userId: number) => {
      const accountIds = drafts[userId] ?? savedByUserId[userId] ?? []
      try {
        setFlashError(null)
        setSavingRowId(userId)
        await accountsApi.assignToUser(userId, accountIds)
        const rows = await fetchUsers()
        applyUserRows(rows)

        // Refresh options for all users since assignments changed
        const optionEntries = await Promise.all(
          rows.map(async (row) => {
            const options = await accountsApi.listUserAssignOptions(row.id)
            return [row.id, options] as const
          }),
        )
        setAccountOptionsByUser(Object.fromEntries(optionEntries))

        toast.success('Assigned accounts successfully')
      } catch (err) {
        setFlashError(formatApiError(err))
      } finally {
        setSavingRowId(null)
      }
    },
    [applyUserRows, drafts, fetchUsers, savedByUserId],
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

  // Per-user options filtered to exclude accounts claimed by other users in the draft
  const filteredOptionsByUser = useMemo(() => {
    const result: Record<number, AccountOptionForAssign[]> = {}
    for (const [userIdStr, options] of Object.entries(accountOptionsByUser)) {
      const userId = Number(userIdStr)
      const claimed = claimedByOthers(drafts, userId)
      result[userId] = options.filter((opt) => !claimed.has(opt.id))
    }
    return result
  }, [accountOptionsByUser, drafts])

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

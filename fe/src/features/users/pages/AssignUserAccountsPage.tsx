import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Search } from 'lucide-react'
import { toast } from 'sonner'

import { AssignUserAccountsTableCard } from '@/features/users/components/AssignUserAccountsTableCard'
import { usersApi } from '@/features/users/api/users'
import type {
  AccountOptionForAssign,
  AssignedAccountSummary,
  UserAccountAssignmentRow,
  UserFilterParams,
} from '@/features/users/types'
import { formatApiError } from '@/features/settings/components'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { Input } from '@/components/ui/input'

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
  if (!Array.isArray(accounts)) {
    return []
  }

  return accounts
    .map((account) => {
      const id = Number(account.id)
      if (!Number.isInteger(id)) {
        return null
      }

      const rawAccountId = typeof account.account_id === 'string' ? account.account_id.trim() : ''

      return {
        id,
        account_id: rawAccountId.length > 0 ? rawAccountId : String(id),
        account_name: typeof account.account_name === 'string' ? account.account_name : null,
      } satisfies AssignedAccountSummary
    })
    .filter((account): account is AssignedAccountSummary => account !== null)
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
  const ids = row.accounts
    .map((account) => Number(account.id))
    .filter((id): id is number => Number.isInteger(id))

  return toUniqueSortedIds(ids)
}

function savedByUserFromRows(rows: UserAccountAssignmentRow[]): Record<number, number[]> {
  return Object.fromEntries(rows.map((row) => [row.id, assignedAccountIdsFromRow(row)]))
}

function draftsFromSaved(savedByUserId: Record<number, number[]>): Record<number, number[]> {
  return Object.fromEntries(
    Object.entries(savedByUserId).map(([userId, accountIds]) => [Number(userId), [...accountIds]]),
  )
}

export function AssignUserAccountsPage() {
  const user = useAuthStore((s) => s.user)
  const perms = user?.permissions ?? []
  const canAssign = hasPermission(perms, PermissionSlugs.AccountsAssign)

  const [users, setUsers] = useState<UserAccountAssignmentRow[]>([])
  const [accountOptions, setAccountOptions] = useState<AccountOptionForAssign[]>([])
  const [savedByUserId, setSavedByUserId] = useState<Record<number, number[]>>({})
  const [drafts, setDrafts] = useState<Record<number, number[]>>({})
  const [loading, setLoading] = useState(true)
  const [savingRowId, setSavingRowId] = useState<number | null>(null)
  const [flashError, setFlashError] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('')

  const fetchUsers = useCallback(async () => {
    const firstPage = await usersApi.list(1, USER_LIST_PAGE_SIZE, USER_LIST_FILTERS)
    const firstRows = toUserAccountAssignmentRows(firstPage.data.data)
    const lastPage = Math.max(firstPage.data.pagination.last_page || 1, 1)

    if (lastPage === 1) {
      return firstRows
    }

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
    let ignore = false

    const fetchData = async () => {
      try {
        setLoading(true)
        const [userRows, options] = await Promise.all([fetchUsers(), usersApi.listAccountOptions()])
        if (!ignore) {
          applyUserRows(userRows)
          setAccountOptions(options)
        }
      } catch (err) {
        if (!ignore) {
          toast.error(formatApiError(err))
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void fetchData()

    return () => {
      ignore = true
    }
  }, [applyUserRows, fetchUsers])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUserSearch(userSearch)
    }, 400)

    return () => clearTimeout(timer)
  }, [userSearch])

  const onDraftChange = useCallback((userId: number, accountIds: number[]) => {
    setDrafts((current) => ({ ...current, [userId]: toUniqueSortedIds(accountIds) }))
  }, [])

  const saveRowAsync = useCallback(
    async (userId: number) => {
      const accountIds = drafts[userId] ?? savedByUserId[userId] ?? []
      try {
        setFlashError(null)
        setSavingRowId(userId)
        await usersApi.assignAccounts(userId, accountIds)
        const rows = await fetchUsers()
        applyUserRows(rows)
        toast.success(`Assigned accounts successfully`)
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
    if (!searchQuery) {
      return users
    }
    return users.filter(
      (row) =>
        row.name.toLowerCase().includes(searchQuery) ||
        row.email.toLowerCase().includes(searchQuery),
    )
  }, [searchQuery, users])
  const emptyMessage = searchQuery ? 'No users found' : 'No users to assign'

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Assign accounts to each user. Press{' '}
        <span className="font-medium text-foreground">Save</span> on a row to apply changes.
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
        accountOptions={accountOptions}
        drafts={drafts}
        savedByUserId={savedByUserId}
        onDraftChange={onDraftChange}
        onSaveRow={onSaveRow}
        savingRowId={savingRowId}
        canAssign={canAssign}
        emptyMessage={emptyMessage}
      />
    </div>
  )
}

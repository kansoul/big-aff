import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Search } from 'lucide-react'
import { toast } from 'sonner'

import { channelsApi } from '@/features/channels/api'
import type {
  ChannelOptionForAssign,
  UserChannelAssignmentRow,
} from '@/features/channels/types/userChannelAssignments'
import { AssignUserChannelsTableCard } from '@/features/channels/components/AssignUserChannelsTableCard'

import { formatApiError } from '@/features/settings/components'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

const PAGE_SIZE = 100

function toUniqueSortedCodes(codes: string[]): string[] {
  return Array.from(new Set(codes)).sort()
}

function savedByUserFromRows(rows: UserChannelAssignmentRow[]): Record<number, string[]> {
  return Object.fromEntries(
    rows.map((row) => [
      row.id,
      toUniqueSortedCodes(row.channels.map((c) => c.code).filter(Boolean)),
    ]),
  )
}

function draftsFromSaved(savedByUserId: Record<number, string[]>): Record<number, string[]> {
  return Object.fromEntries(
    Object.entries(savedByUserId).map(([userId, codes]) => [Number(userId), [...codes]]),
  )
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssignUserChannelsDialog({ open, onOpenChange }: Props) {
  const user = useAuthStore((s) => s.user)
  const perms = user?.permissions ?? []
  const canAssign = hasPermission(perms, PermissionSlugs.ChannelsAssign)

  const [users, setUsers] = useState<UserChannelAssignmentRow[]>([])
  const [savedByUserId, setSavedByUserId] = useState<Record<number, string[]>>({})
  const [drafts, setDrafts] = useState<Record<number, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [savingRowId, setSavingRowId] = useState<number | null>(null)
  const [flashError, setFlashError] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('')

  const fetchAllUsers = useCallback(async () => {
    const first = await channelsApi.listUsersWithChannels({ per_page: PAGE_SIZE, page: 1 })
    const lastPage = Math.max(first.pagination.last_page || 1, 1)
    const rows = [...first.data]

    for (let page = 2; page <= lastPage; page += 1) {
      const res = await channelsApi.listUsersWithChannels({ per_page: PAGE_SIZE, page })
      rows.push(...res.data)
    }

    return rows.map((r) => ({
      id: r.user_id,
      name: r.name,
      email: r.email,
      channels: r.channels,
    })) satisfies UserChannelAssignmentRow[]
  }, [])

  const fetchAllChannels = useCallback(async (): Promise<ChannelOptionForAssign[]> => {
    const first = await channelsApi.list({ per_page: PAGE_SIZE, page: 1 })
    const lastPage = Math.max(first.pagination?.last_page || 1, 1)
    const items = [...first.data]

    for (let page = 2; page <= lastPage; page += 1) {
      const res = await channelsApi.list({ per_page: PAGE_SIZE, page })
      items.push(...res.data)
    }

    return items.map((c) => ({ code: c.code, name: c.name }))
  }, [])

  const applyUserRows = useCallback((rows: UserChannelAssignmentRow[]) => {
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
        const [userRows] = await Promise.all([fetchAllUsers()])
        if (ignore) return

        applyUserRows(userRows)
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
  }, [open, applyUserRows, fetchAllUsers, fetchAllChannels])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedUserSearch(userSearch), 400)
    return () => clearTimeout(timer)
  }, [userSearch])

  const onDraftChange = useCallback((userId: number, channelCodes: string[]) => {
    setDrafts((current) => ({ ...current, [userId]: toUniqueSortedCodes(channelCodes) }))
  }, [])

  const saveRowAsync = useCallback(
    async (userId: number) => {
      const channelCodes = drafts[userId] ?? savedByUserId[userId] ?? []
      try {
        setFlashError(null)
        setSavingRowId(userId)
        const result = await channelsApi.assignToUser(userId, channelCodes)

        const rows = await fetchAllUsers()
        applyUserRows(rows)

        const skipped: string[] = result.skipped_codes ?? []
        if (skipped.length > 0) {
          toast.warning(
            `Skipped ${skipped.length} channel(s) already assigned to another user: ${skipped.join(', ')}`,
            { duration: 8000 },
          )
        } else {
          toast.success('Assigned channels successfully')
        }
      } catch (err) {
        setFlashError(formatApiError(err))
      } finally {
        setSavingRowId(null)
      }
    },
    [applyUserRows, drafts, fetchAllUsers, savedByUserId],
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
      <DialogContent className="flex max-h-[90vh] max-w-[95vw]! md:max-w-[70vw]! flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Assign Channels to Users</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Assign channels to each user. Press{' '}
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

          <AssignUserChannelsTableCard
            loading={loading}
            users={filteredUsers}
            drafts={drafts}
            savedByUserId={savedByUserId}
            onDraftChange={onDraftChange}
            onSaveRow={onSaveRow}
            savingRowId={savingRowId}
            canAssign={canAssign}
            currentUserId={user?.id}
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

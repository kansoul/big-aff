import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Search } from 'lucide-react'
import { toast } from 'sonner'

import { AssignUserPostsTableCard, type UserPostAssignmentRow } from './AssignUserPostsTableCard'
import type { AssignPostOption } from './AssignUserPostsPicker'
import { usersApi } from '@/features/users/api/users'
import { postsApi } from '@/features/posts/api'
import type { PostFilterParams } from '@/features/posts/types'
import { formatApiError } from '@/features/settings/components'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

const PAGE_SIZE = 100

function toSortedIds(ids: number[]): number[] {
  return Array.from(new Set(ids)).sort((a, b) => a - b)
}

function savedByUserFromRows(rows: UserPostAssignmentRow[]): Record<number, number[]> {
  return Object.fromEntries(rows.map((r) => [r.id, toSortedIds(r.assigned_post_ids)]))
}

type AssignPostsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssignPostsDialog({ open, onOpenChange }: AssignPostsDialogProps) {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])
  const canAssign = useMemo(() => hasPermission(perms, PermissionSlugs.PostsAssign), [perms])

  const [users, setUsers] = useState<UserPostAssignmentRow[]>([])
  const [postOptions, setPostOptions] = useState<AssignPostOption[]>([])
  const [loading, setLoading] = useState(false)
  const [flashError, setFlashError] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [drafts, setDrafts] = useState<Record<number, number[]>>({})
  const [savedByUserId, setSavedByUserId] = useState<Record<number, number[]>>({})
  const [savingRowId, setSavingRowId] = useState<number | null>(null)

  const applyUserRows = useCallback((rows: UserPostAssignmentRow[]) => {
    const saved = savedByUserFromRows(rows)
    setUsers(rows)
    setSavedByUserId(saved)
    setDrafts(Object.fromEntries(Object.entries(saved).map(([k, v]) => [Number(k), [...v]])))
  }, [])

  const fetchAllPosts = useCallback(async (): Promise<AssignPostOption[]> => {
    const emptyFilters: PostFilterParams = {
      query: null,
      status: null,
      category_id: null,
      lang: null,
      type: null,
      order_by: null,
      order: null,
    }
    const first = await postsApi.list(1, PAGE_SIZE, emptyFilters)
    const lastPage = Math.max(first.data.pagination?.last_page ?? 1, 1)
    const items = [...first.data.data]

    for (let page = 2; page <= lastPage; page++) {
      const res = await postsApi.list(page, PAGE_SIZE, emptyFilters)
      items.push(...res.data.data)
    }

    return items.map((p) => ({ id: p.id, title: p.title }))
  }, [])

  useEffect(() => {
    if (!open) return
    let ignore = false

    const fetchData = async () => {
      setLoading(true)
      try {
        const [assignmentsRes, posts] = await Promise.all([
          usersApi.listPostAssignments(1, PAGE_SIZE),
          fetchAllPosts(),
        ])

        if (ignore) return

        const rows: UserPostAssignmentRow[] = (
          assignmentsRes.data as { data: UserPostAssignmentRow[] }
        ).data.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          assigned_post_ids: u.assigned_post_ids,
        }))

        applyUserRows(rows)
        setPostOptions(posts)
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
  }, [open, applyUserRows, fetchAllPosts])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(userSearch), 400)
    return () => clearTimeout(timer)
  }, [userSearch])

  const onDraftChange = useCallback((userId: number, postIds: number[]) => {
    setDrafts((prev) => ({ ...prev, [userId]: postIds }))
  }, [])

  const onSaveRow = useCallback(
    async (userId: number) => {
      const postIds = drafts[userId] ?? savedByUserId[userId] ?? []
      setSavingRowId(userId)
      setFlashError(null)
      try {
        await usersApi.assignPosts(userId, postIds)

        const refreshRes = await usersApi.listPostAssignments(1, PAGE_SIZE)
        const refreshedRows: UserPostAssignmentRow[] = (
          refreshRes.data as { data: UserPostAssignmentRow[] }
        ).data.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          assigned_post_ids: u.assigned_post_ids,
        }))
        applyUserRows(refreshedRows)
        toast.success('Posts assigned successfully')
      } catch (err) {
        setFlashError(formatApiError(err))
      } finally {
        setSavingRowId(null)
      }
    },
    [drafts, savedByUserId, applyUserRows],
  )

  const searchQuery = debouncedSearch.trim().toLowerCase()
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
      <DialogContent className="flex max-h-[90vh] w-full max-w-fit! flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Assign Posts to Users</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Assign posts to each user. Press{' '}
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

          <AssignUserPostsTableCard
            loading={loading}
            users={filteredUsers}
            postOptions={postOptions}
            drafts={drafts}
            savedByUserId={savedByUserId}
            onDraftChange={onDraftChange}
            onSaveRow={(userId) => void onSaveRow(userId)}
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

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { AssignUserPostsTableCard, type UserPostAssignmentRow } from './AssignUserPostsTableCard'
import { usersApi } from '@/features/users/api/users'
import { formatApiError } from '@/features/settings/components'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const PAGE_SIZE = 100

function toSortedIds(ids: number[]): number[] {
  return Array.from(new Set(ids)).sort((a, b) => a - b)
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
  const [loading, setLoading] = useState(false)

  const [drafts, setDrafts] = useState<Record<number, number[]>>({})
  const [savedByUserId, setSavedByUserId] = useState<Record<number, number[]>>({})
  const [savingRowId, setSavingRowId] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return

    let ignore = false

    const fetchData = async () => {
      setLoading(true)
      setDrafts({})
      try {
        const assignmentsRes = await usersApi.listPostAssignments(1, PAGE_SIZE)

        if (!ignore) {
          const rows: UserPostAssignmentRow[] = (
            assignmentsRes.data as { data: UserPostAssignmentRow[] }
          ).data.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            assigned_post_ids: u.assigned_post_ids,
          }))

          setUsers(rows)
          setSavedByUserId(
            Object.fromEntries(rows.map((r) => [r.id, toSortedIds(r.assigned_post_ids)])),
          )
        }
      } catch (err) {
        if (!ignore) {
          toast.error(formatApiError(err))
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    void fetchData()

    return () => {
      ignore = true
    }
  }, [open])

  const onDraftChange = useCallback((userId: number, postIds: number[]) => {
    setDrafts((prev) => ({ ...prev, [userId]: postIds }))
  }, [])

  const onSaveRow = useCallback(
    async (userId: number) => {
      const postIds = drafts[userId] ?? savedByUserId[userId] ?? []
      setSavingRowId(userId)
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
        setUsers(refreshedRows)
        setSavedByUserId(
          Object.fromEntries(refreshedRows.map((r) => [r.id, toSortedIds(r.assigned_post_ids)])),
        )
        setDrafts((prev) => {
          const next = { ...prev }
          delete next[userId]
          return next
        })
        toast.success('Posts assigned successfully')
      } catch (err) {
        toast.error(formatApiError(err))
      } finally {
        setSavingRowId(null)
      }
    },
    [drafts, savedByUserId],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[95vh] min-w-[95vw] max-w-none flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>Assign Posts</DialogTitle>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <AssignUserPostsTableCard
            loading={loading}
            users={users}
            drafts={drafts}
            savedByUserId={savedByUserId}
            onDraftChange={onDraftChange}
            onSaveRow={(userId) => void onSaveRow(userId)}
            savingRowId={savingRowId}
            canAssign={canAssign}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

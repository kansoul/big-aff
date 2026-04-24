import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { postsApi } from '@/features/posts/api'
import {
  AssignUserPostsTableCard,
  type UserPostAssignmentRow,
} from '@/features/posts/components/AssignUserPostsTableCard'
import type { AssignPostOption } from '@/features/posts/components/AssignUserPostsPicker'
import { usersApi } from '@/features/users/api/users'
import { formatApiError } from '@/features/settings/components'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'

const PAGE_SIZE = 100

function toSortedIds(ids: number[]): number[] {
  return Array.from(new Set(ids)).sort((a, b) => a - b)
}

export function AssignUserPostsPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])
  const canAssign = useMemo(() => hasPermission(perms, PermissionSlugs.PostsAssign), [perms])

  const [users, setUsers] = useState<UserPostAssignmentRow[]>([])
  const [postOptions, setPostOptions] = useState<AssignPostOption[]>([])
  const [loading, setLoading] = useState(true)

  const [drafts, setDrafts] = useState<Record<number, number[]>>({})
  const [savedByUserId, setSavedByUserId] = useState<Record<number, number[]>>({})
  const [savingRowId, setSavingRowId] = useState<number | null>(null)

  useEffect(() => {
    let ignore = false

    const fetchData = async () => {
      setLoading(true)
      try {
        const [assignmentsRes, postsRes] = await Promise.all([
          usersApi.listPostAssignments(1, PAGE_SIZE),
          postsApi.list(1, 500, {
            query: null,
            status: null,
            category_id: null,
            lang: null,
            type: null,
            order_by: 'title',
            order: 'asc',
          }),
        ])

        if (!ignore) {
          const rows: UserPostAssignmentRow[] = assignmentsRes.data.data.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            assigned_post_ids: u.assigned_post_ids,
          }))

          setUsers(rows)
          setSavedByUserId(
            Object.fromEntries(rows.map((r) => [r.id, toSortedIds(r.assigned_post_ids)])),
          )

          setPostOptions(postsRes.data.data.map((p) => ({ id: p.id, title: p.title })))
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
  }, [])

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
          refreshRes.data as unknown as { data: { data: UserPostAssignmentRow[] } }
        ).data.data.map((u) => ({
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Assign Post</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign posts to users for view-only access.
        </p>
      </div>
      <AssignUserPostsTableCard
        loading={loading}
        users={users}
        postOptions={postOptions}
        drafts={drafts}
        savedByUserId={savedByUserId}
        onDraftChange={onDraftChange}
        onSaveRow={(userId) => void onSaveRow(userId)}
        savingRowId={savingRowId}
        canAssign={canAssign}
      />
    </div>
  )
}

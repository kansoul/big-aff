import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MRT_SortingState } from 'mantine-react-table'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { BulkDeleteDialog } from '@/components/common/BulkDeleteDialog'
import { postsApi } from '@/features/posts/api'
import { PostsTableCard, DeletePostDialog } from '@/features/posts/components'
import { AssignPostsDialog } from '@/features/posts/components/AssignPostsDialog'
import { formatApiError } from '@/features/settings/components'
import type { Post, PostFilterParams, PostOrderBy } from '@/features/posts/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { PATHS, postEditPath, postViewPath } from '@/constants/paths'
import { useAuthStore } from '@/hooks/useAuthStore'

type PaginationState = { pageIndex: number; pageSize: number }

const DEFAULT_FILTERS: PostFilterParams = {
  query: null,
  status: null,
  category_id: null,
  lang: null,
  type: null,
  order_by: null,
  order: null,
  created_at_from: null,
  created_at_to: null,
  created_by: null,
  deleted_at: null,
  is_hidden: null,
}

export function PostsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])

  const canCreate = useMemo(() => hasPermission(perms, PermissionSlugs.PostsCreate), [perms])
  const canUpdate = useMemo(() => hasPermission(perms, PermissionSlugs.PostsUpdate), [perms])
  const canDelete = useMemo(() => hasPermission(perms, PermissionSlugs.PostsDelete), [perms])
  const canPublish = useMemo(() => hasPermission(perms, PermissionSlugs.PostsPublish), [perms])
  const canAssignPosts = useMemo(() => hasPermission(perms, PermissionSlugs.PostsAssign), [perms])

  const [data, setData] = useState<Post[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 30 })
  const [filters, setFilters] = useState<PostFilterParams>(DEFAULT_FILTERS)
  const [assignPostsOpen, setAssignPostsOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const [refreshSignal, setRefreshSignal] = useState(0)
  const loadData = useCallback(() => {
    setRefreshSignal((s) => s + 1)
  }, [])

  useEffect(() => {
    let ignore = false

    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await postsApi.list(pagination.pageIndex + 1, pagination.pageSize, filters)
        if (!ignore) {
          setData(res.data.data)
          setRowCount(res.data.pagination.total)
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
  }, [pagination.pageIndex, pagination.pageSize, filters, refreshSignal])

  const onFilterChange = useCallback((patch: Partial<PostFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  const onFilterReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  const onSortingChange = useCallback((sorting: MRT_SortingState) => {
    const first = sorting[0] ?? null
    setFilters((prev) => ({
      ...prev,
      order_by: first ? (first.id as PostOrderBy) : null,
      order: first ? (first.desc ? 'desc' : 'asc') : null,
    }))
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  const onAddClick = useCallback(() => {
    void navigate(PATHS.postsCreate)
  }, [navigate])

  const onViewRow = useCallback(
    (row: Post) => {
      void navigate(postViewPath(row.id))
    },
    [navigate],
  )

  const onEditRow = useCallback(
    (row: Post) => {
      void navigate(postEditPath(row.id))
    },
    [navigate],
  )

  const onDeleteRow = useCallback((row: Post) => {
    setDeleteTarget(row)
  }, [])

  const onBulkDeleteClick = useCallback(() => {
    setBulkDeleteOpen(true)
  }, [])

  const onDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null)
  }, [])

  const onBulkDeleteOpenChange = useCallback((open: boolean) => {
    setBulkDeleteOpen(open)
  }, [])

  const onToggleHidden = useCallback(
    (row: Post) => {
      void (async () => {
        try {
          await postsApi.update(row.id, {
            title: row.title,
            slug: row.slug,
            lang: row.lang,
            note: row.note,
            description: row.description,
            content: row.content,
            feature_media_id: row.feature_media_id,
            status: row.status,
            type: row.type ?? 'normal',
            category_id: row.category_id,
            published_at: row.published_at,
            keyword_set_ids: row.keyword_sets?.map((ks) => ks.id) ?? null,
            is_hidden: !row.is_hidden,
          })
          toast.success(row.is_hidden ? 'Post unhidden successfully' : 'Post hidden successfully')
          loadData()
        } catch (err) {
          toast.error(formatApiError(err))
        }
      })()
    },
    [loadData],
  )

  const onPublishRow = useCallback(
    (row: Post, publish: boolean) => {
      void (async () => {
        try {
          await postsApi.publish(row.id, publish)
          toast.success(publish ? 'Post published successfully' : 'Post unpublished successfully')
          loadData()
        } catch (err) {
          toast.error(formatApiError(err))
        }
      })()
    },
    [loadData],
  )

  const onConfirmBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    try {
      setBulkDeleting(true)
      const results = await Promise.allSettled(ids.map((id) => postsApi.remove(id)))
      const failedIds = new Set<number>()
      let firstError: unknown = null

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failedIds.add(ids[index])
          if (!firstError) firstError = result.reason
        }
      })

      const deletedCount = ids.length - failedIds.size
      if (deletedCount > 0) {
        toast.success(`Deleted ${deletedCount} post${deletedCount > 1 ? 's' : ''} successfully`)
      }
      if (firstError) {
        toast.error(formatApiError(firstError))
      }

      setSelectedIds(failedIds)
      setBulkDeleteOpen(false)
      loadData()
    } finally {
      setBulkDeleting(false)
    }
  }, [selectedIds, loadData])

  return (
    <div className="flex flex-col gap-8">
      <PostsTableCard
        data={data}
        rowCount={rowCount}
        loading={loading}
        pagination={pagination}
        onPaginationChange={setPagination}
        filters={filters}
        onFilterChange={onFilterChange}
        onFilterReset={onFilterReset}
        onSortingChange={onSortingChange}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        canPublish={canPublish}
        canAssignPosts={canAssignPosts}
        onAddClick={onAddClick}
        onAssignPostsClick={() => setAssignPostsOpen(true)}
        onViewRow={onViewRow}
        onEditRow={onEditRow}
        onDeleteRow={onDeleteRow}
        onToggleHidden={onToggleHidden}
        onPublishRow={onPublishRow}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onBulkDeleteClick={onBulkDeleteClick}
      />

      <DeletePostDialog
        post={deleteTarget}
        onOpenChange={onDeleteOpenChange}
        onSuccess={() => void loadData()}
      />

      <AssignPostsDialog open={assignPostsOpen} onOpenChange={setAssignPostsOpen} />

      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={onBulkDeleteOpenChange}
        count={selectedIds.size}
        itemLabel="post"
        deleting={bulkDeleting}
        onConfirm={onConfirmBulkDelete}
      />
    </div>
  )
}

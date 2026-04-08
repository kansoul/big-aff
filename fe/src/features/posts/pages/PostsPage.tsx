import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MRT_SortingState } from 'mantine-react-table'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { postsApi } from '@/features/posts/api'
import { PostsTableCard, DeletePostDialog } from '@/features/posts/components'
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
}

export function PostsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])

  const canCreate = useMemo(() => hasPermission(perms, PermissionSlugs.PostsCreate), [perms])
  const canUpdate = useMemo(() => hasPermission(perms, PermissionSlugs.PostsUpdate), [perms])
  const canDelete = useMemo(() => hasPermission(perms, PermissionSlugs.PostsDelete), [perms])

  const [data, setData] = useState<Post[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 30 })
  const [filters, setFilters] = useState<PostFilterParams>(DEFAULT_FILTERS)
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null)

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

  const onFilterChange = useCallback((field: keyof PostFilterParams, value: string | null) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
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

  const onDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null)
  }, [])

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
        onSortingChange={onSortingChange}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onAddClick={onAddClick}
        onViewRow={onViewRow}
        onEditRow={onEditRow}
        onDeleteRow={onDeleteRow}
      />

      <DeletePostDialog
        post={deleteTarget}
        onOpenChange={onDeleteOpenChange}
        onSuccess={() => void loadData()}
      />
    </div>
  )
}

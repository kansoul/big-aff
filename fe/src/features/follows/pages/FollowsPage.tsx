import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { BulkDeleteDialog } from '@/components/common/BulkDeleteDialog'
import { followsApi } from '@/features/follows/api'
import { DeleteFollowDialog, FollowsTableCard } from '@/features/follows/components'
import { formatApiError } from '@/features/settings/components'
import type { Follow, FollowFilterParams } from '@/features/follows/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { useTableUrlState } from '@/hooks/useTableUrlState'
import { setPaginationInParams, type TablePaginationState } from '@/lib/utils'

const DEFAULT_FILTERS: FollowFilterParams = {
  query: null,
  site_id: null,
  post_id: null,
  order_by: null,
  order: null,
}

function parseFilters(params: URLSearchParams): FollowFilterParams {
  return {
    query: params.get('query'),
    site_id: params.get('site_id') ? Number(params.get('site_id')) : null,
    post_id: params.get('post_id') ? Number(params.get('post_id')) : null,
    order_by: params.get('order_by') as FollowFilterParams['order_by'],
    order: params.get('order') as FollowFilterParams['order'],
  }
}

function buildParams(
  filters: FollowFilterParams,
  pagination: TablePaginationState,
): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.query) params.set('query', filters.query)
  if (filters.site_id != null) params.set('site_id', String(filters.site_id))
  if (filters.post_id != null) params.set('post_id', String(filters.post_id))
  if (filters.order_by) params.set('order_by', filters.order_by)
  if (filters.order) params.set('order', filters.order)
  setPaginationInParams(params, pagination)
  return params
}

export function FollowsPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])

  const canDelete = useMemo(() => hasPermission(perms, PermissionSlugs.FollowsDelete), [perms])

  const [data, setData] = useState<Follow[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const { filters, pagination, setPagination, onFilterChange } =
    useTableUrlState<FollowFilterParams>({
      parseFilters,
      buildParams,
      defaultFilters: DEFAULT_FILTERS,
    })

  const [deleteTarget, setDeleteTarget] = useState<Follow | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const [refreshSignal, setRefreshSignal] = useState(0)
  const loadData = useCallback(() => setRefreshSignal((s) => s + 1), [])

  useEffect(() => {
    let ignore = false
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await followsApi.list({
          ...filters,
          page: pagination.pageIndex + 1,
          per_page: pagination.pageSize,
        })
        if (!ignore) {
          setData(res.data.data)
          setRowCount(res.data.pagination.total)
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
  }, [pagination.pageIndex, pagination.pageSize, filters, refreshSignal])

  const onSortingChange = useCallback(
    (orderBy: string | null, order: 'asc' | 'desc' | null) => {
      onFilterChange({
        order_by: (orderBy as FollowFilterParams['order_by']) ?? null,
        order: order ?? null,
      })
    },
    [onFilterChange],
  )

  const onDeleteRow = useCallback((row: Follow) => {
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

  const onConfirmBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    try {
      setBulkDeleting(true)
      const results = await Promise.allSettled(ids.map((id) => followsApi.remove(id)))
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
        toast.success(`Deleted ${deletedCount} follow${deletedCount > 1 ? 's' : ''} successfully`)
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

  const onSuccess = useCallback(() => {
    loadData()
  }, [loadData])

  const apiFilters = { ...filters, page: pagination.pageIndex + 1, per_page: pagination.pageSize }

  return (
    <div className="flex flex-col gap-8">
      <FollowsTableCard
        data={data}
        rowCount={rowCount}
        loading={loading}
        filters={apiFilters}
        onPaginationChange={(page, perPage) =>
          setPagination({ pageIndex: page - 1, pageSize: perPage })
        }
        onSortingChange={onSortingChange}
        canDelete={canDelete}
        onDeleteRow={onDeleteRow}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onBulkDeleteClick={onBulkDeleteClick}
      />

      <DeleteFollowDialog
        follow={deleteTarget}
        onOpenChange={onDeleteOpenChange}
        onSuccess={onSuccess}
      />

      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={onBulkDeleteOpenChange}
        count={selectedIds.size}
        itemLabel="follow"
        deleting={bulkDeleting}
        onConfirm={onConfirmBulkDelete}
      />
    </div>
  )
}

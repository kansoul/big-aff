import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { BulkDeleteDialog } from '@/components/common/BulkDeleteDialog'
import { followsApi } from '@/features/follows/api'
import { DeleteFollowDialog, FollowsTableCard } from '@/features/follows/components'
import { formatApiError } from '@/features/settings/components'
import type { Follow, FollowFilterParams } from '@/features/follows/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'

export function FollowsPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])

  const canDelete = useMemo(() => hasPermission(perms, PermissionSlugs.FollowsDelete), [perms])

  const [data, setData] = useState<Follow[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<FollowFilterParams>({ page: 1, per_page: 30 })

  const [deleteTarget, setDeleteTarget] = useState<Follow | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const loadData = useCallback(async (activeFilters: FollowFilterParams) => {
    try {
      setLoading(true)
      const res = await followsApi.list(activeFilters)
      setData(res.data.data)
      setRowCount(res.data.pagination.total)
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData(filters)
  }, [loadData, filters])

  const onPaginationChange = useCallback((page: number, perPage: number) => {
    setFilters((prev) => ({ ...prev, page, per_page: perPage }))
  }, [])

  const onSortingChange = useCallback((orderBy: string | null, order: 'asc' | 'desc' | null) => {
    setFilters((prev) => ({
      ...prev,
      order_by: (orderBy as FollowFilterParams['order_by']) ?? undefined,
      order: order ?? undefined,
      page: 1,
    }))
  }, [])

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
      void loadData(filters)
    } finally {
      setBulkDeleting(false)
    }
  }, [selectedIds, loadData, filters])

  const onSuccess = useCallback(() => {
    void loadData(filters)
  }, [loadData, filters])

  return (
    <div className="flex flex-col gap-8">
      <FollowsTableCard
        data={data}
        rowCount={rowCount}
        loading={loading}
        filters={filters}
        onPaginationChange={onPaginationChange}
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

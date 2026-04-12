import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { BulkDeleteDialog } from '@/components/common/BulkDeleteDialog'
import { adClientsApi } from '@/features/ad-clients/api'
import {
  AdClientsTableCard,
  CreateAdClientDialog,
  DeleteAdClientDialog,
  EditAdClientDialog,
} from '@/features/ad-clients/components'
import type { AdClient, AdClientFilterParams } from '@/features/ad-clients/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { formatApiError } from '@/features/settings/components'

const DEFAULT_FILTERS: AdClientFilterParams = {
  page: 1,
  per_page: 30,
}

export function AdClientsPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])

  const canCreate = useMemo(() => hasPermission(perms, PermissionSlugs.AdClientsCreate), [perms])
  const canUpdate = useMemo(() => hasPermission(perms, PermissionSlugs.AdClientsUpdate), [perms])
  const canDelete = useMemo(() => hasPermission(perms, PermissionSlugs.AdClientsDelete), [perms])

  const [data, setData] = useState<AdClient[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<AdClientFilterParams>(DEFAULT_FILTERS)

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AdClient | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdClient | null>(null)

  // Cross-page selection: keyed by ad client `id` so it survives pagination changes
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const loadData = useCallback(async (activeFilters: AdClientFilterParams) => {
    try {
      setLoading(true)
      const { data } = await adClientsApi.list(activeFilters)
      setData(data.data)
      setRowCount(data.pagination.total)
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData(filters)
  }, [loadData, filters])

  const onFilterChange = useCallback((patch: Partial<AdClientFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }))
  }, [])

  const onFilterReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const onPaginationChange = useCallback((page: number, perPage: number) => {
    setFilters((prev) => ({ ...prev, page, per_page: perPage }))
  }, [])

  const onSortingChange = useCallback((orderBy: string | null, order: 'asc' | 'desc' | null) => {
    setFilters((prev) => ({
      ...prev,
      order_by: (orderBy as AdClientFilterParams['order_by']) ?? undefined,
      order: order ?? undefined,
      page: 1,
    }))
  }, [])

  const onAddClick = useCallback(() => {
    setCreateOpen(true)
  }, [])

  const onEditRow = useCallback((row: AdClient) => {
    setEditTarget(row)
  }, [])

  const onDeleteRow = useCallback((row: AdClient) => {
    setDeleteTarget(row)
  }, [])

  const onEditOpenChange = useCallback((open: boolean) => {
    if (!open) setEditTarget(null)
  }, [])

  const onDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null)
  }, [])

  const onBulkDeleteClick = useCallback(() => {
    setBulkDeleteOpen(true)
  }, [])

  const onBulkDeleteOpenChange = useCallback((open: boolean) => {
    setBulkDeleteOpen(open)
  }, [])

  const onConfirmBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    try {
      setBulkDeleting(true)
      const results = await Promise.allSettled(ids.map((id) => adClientsApi.remove(id)))
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
        toast.success(
          `Deleted ${deletedCount} ad client${deletedCount > 1 ? 's' : ''} successfully`,
        )
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
      <AdClientsTableCard
        data={data}
        rowCount={rowCount}
        loading={loading}
        filters={filters}
        onFilterChange={onFilterChange}
        onFilterReset={onFilterReset}
        onPaginationChange={onPaginationChange}
        onSortingChange={onSortingChange}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onAddClick={onAddClick}
        onEditRow={onEditRow}
        onDeleteRow={onDeleteRow}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onBulkDeleteClick={onBulkDeleteClick}
      />

      <CreateAdClientDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={onSuccess} />

      <EditAdClientDialog
        adClient={editTarget}
        onOpenChange={onEditOpenChange}
        onSuccess={onSuccess}
      />

      <DeleteAdClientDialog
        adClient={deleteTarget}
        onOpenChange={onDeleteOpenChange}
        onSuccess={onSuccess}
      />

      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={onBulkDeleteOpenChange}
        count={selectedIds.size}
        itemLabel="ad client"
        deleting={bulkDeleting}
        onConfirm={onConfirmBulkDelete}
      />
    </div>
  )
}

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
import { useTableUrlState } from '@/hooks/useTableUrlState'
import { setPaginationInParams, type TablePaginationState } from '@/lib/utils'

const DEFAULT_FILTERS: AdClientFilterParams = {
  query: null,
  order_by: null,
  order: null,
}

function parseFilters(params: URLSearchParams): AdClientFilterParams {
  return {
    query: params.get('query'),
    order_by: params.get('order_by') as AdClientFilterParams['order_by'],
    order: params.get('order') as AdClientFilterParams['order'],
  }
}

function buildParams(
  filters: AdClientFilterParams,
  pagination: TablePaginationState,
): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.query) params.set('query', filters.query)
  if (filters.order_by) params.set('order_by', filters.order_by)
  if (filters.order) params.set('order', filters.order)
  setPaginationInParams(params, pagination)
  return params
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

  const { filters, pagination, setPagination, onFilterChange, onFilterReset } =
    useTableUrlState<AdClientFilterParams>({
      parseFilters,
      buildParams,
      defaultFilters: DEFAULT_FILTERS,
    })

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AdClient | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdClient | null>(null)

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
        const { data: res } = await adClientsApi.list({
          ...filters,
          page: pagination.pageIndex + 1,
          per_page: pagination.pageSize,
        })
        if (!ignore) {
          setData(res.data)
          setRowCount(res.pagination.total)
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
        order_by: (orderBy as AdClientFilterParams['order_by']) ?? null,
        order: order ?? null,
      })
    },
    [onFilterChange],
  )

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
      <AdClientsTableCard
        data={data}
        rowCount={rowCount}
        loading={loading}
        filters={apiFilters}
        onFilterChange={onFilterChange}
        onFilterReset={onFilterReset}
        onPaginationChange={(page, perPage) =>
          setPagination({ pageIndex: page - 1, pageSize: perPage })
        }
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

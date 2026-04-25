import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MRT_SortingState } from 'mantine-react-table'
import { toast } from 'sonner'

import { BulkDeleteDialog } from '@/components/common/BulkDeleteDialog'
import { businessCentersApi } from '@/features/business-centers/api'
import { BusinessCentersTableCard } from '@/features/business-centers/components/BusinessCentersTableCard'
import { DeleteBusinessCenterDialog } from '@/features/business-centers/components/DeleteBusinessCenterDialog'
import { CreateBusinessCenterDialog } from '@/features/business-centers/components/CreateBusinessCenterDialog'
import { EditBusinessCenterDialog } from '@/features/business-centers/components/EditBusinessCenterDialog'
import type {
  BusinessCenter,
  BusinessCenterFilterParams,
  BusinessCenterOrderBy,
} from '@/features/business-centers/types'
import { formatApiError } from '@/features/settings/components'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'

type PaginationState = { pageIndex: number; pageSize: number }

const DEFAULT_FILTERS: BusinessCenterFilterParams = {
  query: null,
  order: null,
  order_by: null,
}

export function BusinessCentersPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])
  const canCreate = useMemo(
    () => hasPermission(perms, PermissionSlugs.BusinessCentersCreate),
    [perms],
  )
  const canUpdate = useMemo(
    () => hasPermission(perms, PermissionSlugs.BusinessCentersUpdate),
    [perms],
  )
  const canDelete = useMemo(
    () => hasPermission(perms, PermissionSlugs.BusinessCentersDelete),
    [perms],
  )

  const [createOpen, setCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BusinessCenter | null>(null)

  const onCreateClick = useCallback(() => setCreateOpen(true), [])
  const onEditClick = useCallback((bc: BusinessCenter) => setEditingItem(bc), [])

  const [data, setData] = useState<BusinessCenter[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 30 })
  const [filters, setFilters] = useState<BusinessCenterFilterParams>(DEFAULT_FILTERS)
  const [refreshSignal, setRefreshSignal] = useState(0)

  const loadData = useCallback(() => {
    setRefreshSignal((s) => s + 1)
  }, [])

  useEffect(() => {
    let ignore = false

    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await businessCentersApi.list(
          pagination.pageIndex + 1,
          pagination.pageSize,
          filters,
        )
        if (!ignore) {
          setData(res.data.data)
          setRowCount(res.data.pagination.total)
        }
      } catch (err) {
        if (!ignore) {
          toast.error(formatApiError(err))
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void fetchData()

    return () => {
      ignore = true
    }
  }, [pagination.pageIndex, pagination.pageSize, filters, refreshSignal])

  const onFilterChange = useCallback((patch: Partial<BusinessCenterFilterParams>) => {
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
      order_by: first ? (first.id as BusinessCenterOrderBy) : null,
      order: first ? (first.desc ? 'desc' : 'asc') : null,
    }))
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  const [deletingItem, setDeletingItem] = useState<BusinessCenter | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const onDeleteClick = useCallback((bc: BusinessCenter) => setDeletingItem(bc), [])
  const onBulkDeleteClick = useCallback(() => {
    setBulkDeleteOpen(true)
  }, [])

  const onBulkDeleteOpenChange = useCallback((open: boolean) => {
    setBulkDeleteOpen(open)
  }, [])
  const onDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeletingItem(null)
  }, [])

  const onConfirmDelete = useCallback(async () => {
    if (!deletingItem) return
    try {
      setDeleting(true)
      await businessCentersApi.delete(deletingItem.id)
      toast.success(`Business center "${deletingItem.name}" deleted.`)
      setDeletingItem(null)
      loadData()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setDeleting(false)
    }
  }, [deletingItem, loadData])

  const onConfirmBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    try {
      setBulkDeleting(true)
      const results = await Promise.allSettled(ids.map((id) => businessCentersApi.delete(id)))
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
          `Deleted ${deletedCount} business center${deletedCount > 1 ? 's' : ''} successfully`,
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

  return (
    <div className="flex flex-col gap-8">
      <BusinessCentersTableCard
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
        onCreateClick={onCreateClick}
        canUpdate={canUpdate}
        onEditClick={onEditClick}
        canDelete={canDelete}
        onDeleteClick={onDeleteClick}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onBulkDeleteClick={onBulkDeleteClick}
      />
      <CreateBusinessCenterDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={loadData}
      />
      <EditBusinessCenterDialog
        businessCenter={editingItem}
        onOpenChange={(open) => {
          if (!open) setEditingItem(null)
        }}
        onSuccess={loadData}
      />
      <DeleteBusinessCenterDialog
        businessCenter={deletingItem}
        onOpenChange={onDeleteDialogChange}
        deleting={deleting}
        onConfirmDelete={onConfirmDelete}
      />
      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={onBulkDeleteOpenChange}
        count={selectedIds.size}
        itemLabel="business center"
        deleting={bulkDeleting}
        onConfirm={onConfirmBulkDelete}
      />
    </div>
  )
}

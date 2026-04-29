import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { BulkDeleteDialog } from '@/components/common/BulkDeleteDialog'
import { categoriesApi } from '@/features/categories/api'
import {
  CategoriesTableCard,
  CategoryDetailDialog,
  CategoryFormDialog,
  DeleteCategoryDialog,
} from '@/features/categories/components'
import { formatApiError } from '@/features/settings/components'
import type { Category, CategoryFilterParams } from '@/features/categories/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { useTableUrlState } from '@/hooks/useTableUrlState'
import { setPaginationInParams, type TablePaginationState } from '@/lib/utils'

const DEFAULT_FILTERS: CategoryFilterParams = {
  query: null,
  parent_id: null,
  order_by: null,
  order: null,
}

function parseFilters(params: URLSearchParams): CategoryFilterParams {
  return {
    query: params.get('query'),
    parent_id: params.get('parent_id') ? Number(params.get('parent_id')) : null,
    order_by: params.get('order_by') as CategoryFilterParams['order_by'],
    order: params.get('order') as CategoryFilterParams['order'],
  }
}

function buildParams(
  filters: CategoryFilterParams,
  pagination: TablePaginationState,
): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.query) params.set('query', filters.query)
  if (filters.parent_id != null) params.set('parent_id', String(filters.parent_id))
  if (filters.order_by) params.set('order_by', filters.order_by)
  if (filters.order) params.set('order', filters.order)
  setPaginationInParams(params, pagination)
  return params
}

export function CategoriesPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])

  const canCreate = useMemo(() => hasPermission(perms, PermissionSlugs.CategoriesCreate), [perms])
  const canUpdate = useMemo(() => hasPermission(perms, PermissionSlugs.CategoriesUpdate), [perms])
  const canDelete = useMemo(() => hasPermission(perms, PermissionSlugs.CategoriesDelete), [perms])

  const [data, setData] = useState<Category[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const { filters, pagination, setPagination, onFilterChange, onFilterReset } =
    useTableUrlState<CategoryFilterParams>({
      parseFilters,
      buildParams,
      defaultFilters: DEFAULT_FILTERS,
    })

  // dialog state
  const [viewTarget, setViewTarget] = useState<Category | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
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
        const res = await categoriesApi.list({
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
        order_by: (orderBy as CategoryFilterParams['order_by']) ?? undefined,
        order: order ?? undefined,
      })
    },
    [onFilterChange],
  )

  const onAddClick = useCallback(() => {
    setEditTarget(null)
    setFormOpen(true)
  }, [])

  const onViewRow = useCallback((row: Category) => {
    setViewTarget(row)
  }, [])

  const onEditRow = useCallback((row: Category) => {
    setEditTarget(row)
    setFormOpen(true)
  }, [])

  const onDeleteRow = useCallback((row: Category) => {
    setDeleteTarget(row)
  }, [])

  const onBulkDeleteClick = useCallback(() => {
    setBulkDeleteOpen(true)
  }, [])

  const onFormOpenChange = useCallback((open: boolean) => {
    setFormOpen(open)
    if (!open) setEditTarget(null)
  }, [])

  const onDetailOpenChange = useCallback((open: boolean) => {
    if (!open) setViewTarget(null)
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
      const results = await Promise.allSettled(ids.map((id) => categoriesApi.remove(id)))
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
          `Deleted ${deletedCount} categor${deletedCount > 1 ? 'ies' : 'y'} successfully`,
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
      <CategoriesTableCard
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
        onViewRow={onViewRow}
        onEditRow={onEditRow}
        onDeleteRow={onDeleteRow}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onBulkDeleteClick={onBulkDeleteClick}
      />

      <CategoryDetailDialog category={viewTarget} onOpenChange={onDetailOpenChange} />

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={onFormOpenChange}
        category={editTarget}
        onSuccess={onSuccess}
      />

      <DeleteCategoryDialog
        category={deleteTarget}
        onOpenChange={onDeleteOpenChange}
        onSuccess={onSuccess}
      />

      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={onBulkDeleteOpenChange}
        count={selectedIds.size}
        itemLabel="category"
        deleting={bulkDeleting}
        onConfirm={onConfirmBulkDelete}
      />
    </div>
  )
}

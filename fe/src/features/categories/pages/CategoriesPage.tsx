import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MRT_SortingState } from 'mantine-react-table'
import { toast } from 'sonner'

import { categoriesApi } from '@/features/categories/api'
import {
  CategoriesTableCard,
  CategoryDetailDialog,
  CategoryFormDialog,
  DeleteCategoryDialog,
} from '@/features/categories/components'
import { formatApiError } from '@/features/settings/components'
import type { Category, CategoryFilterParams, CategoryOrderBy } from '@/features/categories/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'

type PaginationState = { pageIndex: number; pageSize: number }

const DEFAULT_FILTERS: CategoryFilterParams = {
  query: null,
  order_by: null,
  order: null,
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
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 30 })
  const [filters, setFilters] = useState<CategoryFilterParams>(DEFAULT_FILTERS)

  // dialog state
  const [viewTarget, setViewTarget] = useState<Category | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)

  const [refreshSignal, setRefreshSignal] = useState(0)

  const loadData = useCallback(() => {
    setRefreshSignal((s) => s + 1)
  }, [])

  useEffect(() => {
    let ignore = false

    const fetchData = async () => {
      setLoading(true)
      try {
        const res = await categoriesApi.list(pagination.pageIndex + 1, pagination.pageSize, filters)
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

  const onFilterChange = useCallback((field: keyof CategoryFilterParams, value: string | null) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  const onSortingChange = useCallback((sorting: MRT_SortingState) => {
    const first = sorting[0] ?? null
    setFilters((prev) => ({
      ...prev,
      order_by: first ? (first.id as CategoryOrderBy) : null,
      order: first ? (first.desc ? 'desc' : 'asc') : null,
    }))
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

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

  return (
    <div className="flex flex-col gap-8">
      <CategoriesTableCard
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

      <CategoryDetailDialog category={viewTarget} onOpenChange={onDetailOpenChange} />

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={onFormOpenChange}
        category={editTarget}
        onSuccess={loadData}
      />

      <DeleteCategoryDialog
        category={deleteTarget}
        onOpenChange={onDeleteOpenChange}
        onSuccess={loadData}
      />
    </div>
  )
}

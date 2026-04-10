import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

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

  const onDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null)
  }, [])

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
      />

      <DeleteFollowDialog
        follow={deleteTarget}
        onOpenChange={onDeleteOpenChange}
        onSuccess={onSuccess}
      />
    </div>
  )
}

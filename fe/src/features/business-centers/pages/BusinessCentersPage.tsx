import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MRT_SortingState } from 'mantine-react-table'
import { toast } from 'sonner'

import { businessCentersApi } from '@/features/business-centers/api'
import { BusinessCentersTableCard } from '@/features/business-centers/components/BusinessCentersTableCard'
import { DeleteBusinessCenterDialog } from '@/features/business-centers/components/DeleteBusinessCenterDialog'
import type {
  BusinessCenter,
  BusinessCenterFilterParams,
  BusinessCenterOrderBy,
} from '@/features/business-centers/types'
import { formatApiError } from '@/features/settings/components'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { PATHS, businessCenterEditPath } from '@/constants/paths'
import { useAuthStore } from '@/hooks/useAuthStore'

type PaginationState = { pageIndex: number; pageSize: number }

const DEFAULT_FILTERS: BusinessCenterFilterParams = {
  query: null,
  order: null,
  order_by: null,
}

export function BusinessCentersPage() {
  const navigate = useNavigate()
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

  const onCreateClick = useCallback(() => void navigate(PATHS.businessCentersCreate), [navigate])
  const onEditClick = useCallback(
    (bc: BusinessCenter) => void navigate(businessCenterEditPath(bc.id), { state: bc }),
    [navigate],
  )

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

  const onDeleteClick = useCallback((bc: BusinessCenter) => setDeletingItem(bc), [])
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
      />
      <DeleteBusinessCenterDialog
        businessCenter={deletingItem}
        onOpenChange={onDeleteDialogChange}
        deleting={deleting}
        onConfirmDelete={onConfirmDelete}
      />
    </div>
  )
}

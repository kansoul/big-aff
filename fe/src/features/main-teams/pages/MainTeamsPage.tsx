import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { mainTeamsApi } from '@/features/main-teams/api'
import {
  DeleteMainTeamDialog,
  MainTeamFormDialog,
  MainTeamsTableCard,
} from '@/features/main-teams/components'
import type { MainTeam, MainTeamFilterParams } from '@/features/main-teams/types'
import { formatApiError } from '@/features/settings/components'
import { useTableUrlState } from '@/hooks/useTableUrlState'
import { setPaginationInParams, type TablePaginationState } from '@/lib/utils'

const DEFAULT_FILTERS: MainTeamFilterParams = {
  query: null,
  order_by: null,
  order: null,
}

function parseFilters(params: URLSearchParams): MainTeamFilterParams {
  return {
    query: params.get('query'),
    order_by: params.get('order_by') as MainTeamFilterParams['order_by'],
    order: params.get('order') as MainTeamFilterParams['order'],
  }
}

function buildParams(
  filters: MainTeamFilterParams,
  pagination: TablePaginationState,
): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.query) params.set('query', filters.query)
  if (filters.order_by) params.set('order_by', filters.order_by)
  if (filters.order) params.set('order', filters.order)
  setPaginationInParams(params, pagination)
  return params
}

export function MainTeamsPage() {
  const [data, setData] = useState<MainTeam[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<MainTeam | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MainTeam | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { filters, pagination, setPagination, onFilterChange, onFilterReset } =
    useTableUrlState<MainTeamFilterParams>({
      parseFilters,
      buildParams,
      defaultFilters: DEFAULT_FILTERS,
    })

  const loadData = useCallback(() => setRefreshSignal((signal) => signal + 1), [])

  useEffect(() => {
    let ignore = false

    const fetchData = async () => {
      try {
        setLoading(true)
        const { data: res } = await mainTeamsApi.list({
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
  }, [filters, pagination.pageIndex, pagination.pageSize, refreshSignal])

  const onSortingChange = useCallback(
    (orderBy: string | null, order: 'asc' | 'desc' | null) => {
      onFilterChange({
        order_by: (orderBy as MainTeamFilterParams['order_by']) ?? null,
        order: order ?? null,
      })
    },
    [onFilterChange],
  )

  const onAddClick = useCallback(() => {
    setEditTarget(null)
    setFormOpen(true)
  }, [])

  const onEditRow = useCallback((row: MainTeam) => {
    setEditTarget(row)
    setFormOpen(true)
  }, [])

  const onDeleteRow = useCallback((row: MainTeam) => {
    setDeleteTarget(row)
  }, [])

  const onFormOpenChange = useCallback((open: boolean) => {
    setFormOpen(open)
    if (!open) setEditTarget(null)
  }, [])

  const onDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null)
  }, [])

  const onConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return

    try {
      setDeleting(true)
      await mainTeamsApi.remove(deleteTarget.id)
      toast.success('Main team deleted successfully')
      setDeleteTarget(null)
      loadData()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, loadData])

  return (
    <div className="flex flex-col gap-6 pb-8">
      <MainTeamsTableCard
        data={data}
        rowCount={rowCount}
        loading={loading}
        filters={{
          ...filters,
          page: pagination.pageIndex + 1,
          per_page: pagination.pageSize,
        }}
        onFilterChange={onFilterChange}
        onFilterReset={onFilterReset}
        onPaginationChange={(page, perPage) =>
          setPagination({ pageIndex: page - 1, pageSize: perPage })
        }
        onSortingChange={onSortingChange}
        onAddClick={onAddClick}
        onEditRow={onEditRow}
        onDeleteRow={onDeleteRow}
      />

      <MainTeamFormDialog
        open={formOpen}
        onOpenChange={onFormOpenChange}
        mainTeam={editTarget}
        onSuccess={loadData}
      />

      <DeleteMainTeamDialog
        mainTeam={deleteTarget}
        deleting={deleting}
        onOpenChange={onDeleteOpenChange}
        onConfirmDelete={onConfirmDelete}
      />
    </div>
  )
}

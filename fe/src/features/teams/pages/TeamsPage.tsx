import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { teamsApi } from '@/features/teams/api'
import { DeleteTeamDialog, TeamFormDialog, TeamsTableCard } from '@/features/teams/components'
import type { Team, TeamFilterParams } from '@/features/teams/types'
import { formatApiError } from '@/features/settings/components'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'

const DEFAULT_FILTERS: TeamFilterParams = {
  page: 1,
  per_page: 30,
}

export function TeamsPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])

  const canCreate = useMemo(() => hasPermission(perms, PermissionSlugs.TeamsCreate), [perms])
  const canUpdate = useMemo(() => hasPermission(perms, PermissionSlugs.TeamsUpdate), [perms])
  const canDelete = useMemo(() => hasPermission(perms, PermissionSlugs.TeamsDelete), [perms])

  const [data, setData] = useState<Team[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<TeamFilterParams>(DEFAULT_FILTERS)

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Team | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null)

  const loadData = useCallback(async (activeFilters: TeamFilterParams) => {
    try {
      setLoading(true)
      const { data } = await teamsApi.list(activeFilters)
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

  const onFilterChange = useCallback((patch: Partial<TeamFilterParams>) => {
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
      order_by: (orderBy as TeamFilterParams['order_by']) ?? undefined,
      order: order ?? undefined,
      page: 1,
    }))
  }, [])

  const onAddClick = useCallback(() => {
    setEditTarget(null)
    setFormOpen(true)
  }, [])

  const onEditRow = useCallback((row: Team) => {
    setEditTarget(row)
    setFormOpen(true)
  }, [])

  const onDeleteRow = useCallback((row: Team) => {
    setDeleteTarget(row)
  }, [])

  const onFormOpenChange = useCallback((open: boolean) => {
    setFormOpen(open)
    if (!open) {
      setEditTarget(null)
    }
  }, [])

  const onDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setDeleteTarget(null)
    }
  }, [])

  const onSuccess = useCallback(() => {
    void loadData(filters)
  }, [loadData, filters])

  return (
    <div className="flex flex-col gap-8">
      <TeamsTableCard
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
      />

      <TeamFormDialog
        open={formOpen}
        onOpenChange={onFormOpenChange}
        team={editTarget}
        onSuccess={onSuccess}
      />

      <DeleteTeamDialog
        team={deleteTarget}
        onOpenChange={onDeleteOpenChange}
        onSuccess={onSuccess}
      />
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { BulkDeleteDialog } from '@/components/common/BulkDeleteDialog'
import { accountsApi } from '@/features/accounts/api'
import { businessCentersApi } from '@/features/business-centers/api'
import { teamsApi } from '@/features/teams/api'
import {
  AccountsTableCard,
  CreateAccountDialog,
  DeleteAccountDialog,
  EditAccountDialog,
} from '@/features/accounts/components'
import type { Account, AccountFilterParams } from '@/features/accounts/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { formatApiError } from '@/features/settings/components'
import type { SearchableSelectOption } from '@/components/common/SearchableSelect'
import type { Team } from '@/features/teams/types'

const DEFAULT_FILTERS: AccountFilterParams = {
  page: 1,
  per_page: 30,
}

function normalizeNumber(value: unknown): number | null | undefined {
  if (value == null || value === '') {
    return undefined
  }

  const parsed = Number(value)
  if (Number.isNaN(parsed)) {
    return undefined
  }

  return parsed
}

export function AccountsPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])

  const canCreate = useMemo(() => hasPermission(perms, PermissionSlugs.AccountsCreate), [perms])
  const canUpdate = useMemo(() => hasPermission(perms, PermissionSlugs.AccountsUpdate), [perms])
  const canDelete = useMemo(() => hasPermission(perms, PermissionSlugs.AccountsDelete), [perms])

  const [data, setData] = useState<Account[]>([])
  const [businessCenterOptions, setBusinessCenterOptions] = useState<SearchableSelectOption[]>([])
  const [teamOptions, setTeamOptions] = useState<SearchableSelectOption[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<AccountFilterParams>(DEFAULT_FILTERS)

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Account | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const loadData = useCallback(async (activeFilters: AccountFilterParams) => {
    try {
      setLoading(true)
      const { data } = await accountsApi.list(activeFilters)
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

  const loadBusinessCenterOptions = useCallback(async () => {
    try {
      const { data } = await businessCentersApi.listOptions()

      setBusinessCenterOptions(
        data.data.map((businessCenter) => ({
          value: String(businessCenter.id),
          label: businessCenter.name,
        })),
      )
    } catch (err) {
      toast.error(formatApiError(err))
    }
  }, [])

  useEffect(() => {
    void loadBusinessCenterOptions()
  }, [loadBusinessCenterOptions])

  const loadTeamOptions = useCallback(async () => {
    try {
      const { data } = await teamsApi.listOptions()
      setTeamOptions(
        data.data.map((team: Pick<Team, 'id' | 'name'>) => ({
          value: String(team.id),
          label: team.name,
        })),
      )
    } catch (err) {
      toast.error(formatApiError(err))
    }
  }, [])

  useEffect(() => {
    void loadTeamOptions()
  }, [loadTeamOptions])

  const onFilterChange = useCallback((patch: Partial<AccountFilterParams>) => {
    const hasBusinessCenterId = Object.prototype.hasOwnProperty.call(patch, 'business_center_id')
    const hasTeamId = Object.prototype.hasOwnProperty.call(patch, 'team_id')

    setFilters((prev) => ({
      ...prev,
      ...patch,
      business_center_id: hasBusinessCenterId
        ? normalizeNumber(patch.business_center_id)
        : prev.business_center_id,
      team_id: hasTeamId ? normalizeNumber(patch.team_id) : prev.team_id,
      page: 1,
    }))
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
      order_by: (orderBy as AccountFilterParams['order_by']) ?? undefined,
      order: order ?? undefined,
      page: 1,
    }))
  }, [])

  const onAddClick = useCallback(() => {
    setCreateOpen(true)
  }, [])

  const onEditRow = useCallback((row: Account) => {
    setEditTarget(row)
  }, [])

  const onDeleteRow = useCallback((row: Account) => {
    setDeleteTarget(row)
  }, [])

  const onEditOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setEditTarget(null)
    }
  }, [])

  const onDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setDeleteTarget(null)
    }
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
      const results = await Promise.allSettled(ids.map((id) => accountsApi.remove(id)))
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
        toast.success(`Deleted ${deletedCount} account${deletedCount > 1 ? 's' : ''} successfully`)
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
      <AccountsTableCard
        data={data}
        businessCenterOptions={businessCenterOptions}
        teamOptions={teamOptions}
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

      <CreateAccountDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={onSuccess}
        businessCenterOptions={businessCenterOptions}
        teamOptions={teamOptions}
      />

      <EditAccountDialog
        account={editTarget}
        onOpenChange={onEditOpenChange}
        onSuccess={onSuccess}
        businessCenterOptions={businessCenterOptions}
        teamOptions={teamOptions}
      />

      <DeleteAccountDialog
        account={deleteTarget}
        onOpenChange={onDeleteOpenChange}
        onSuccess={onSuccess}
      />

      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={onBulkDeleteOpenChange}
        count={selectedIds.size}
        itemLabel="account"
        deleting={bulkDeleting}
        onConfirm={onConfirmBulkDelete}
      />
    </div>
  )
}

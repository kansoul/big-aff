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
import { useTableUrlState } from '@/hooks/useTableUrlState'
import { setPaginationInParams, type TablePaginationState } from '@/lib/utils'

const DEFAULT_FILTERS: AccountFilterParams = {
  query: null,
  ads_type: null,
  business_center_id: null,
  team_id: null,
  status: null,
  order_by: null,
  order: null,
}

function parseFilters(params: URLSearchParams): AccountFilterParams {
  return {
    query: params.get('query'),
    ads_type: params.get('ads_type') as AccountFilterParams['ads_type'],
    business_center_id: params.get('business_center_id')
      ? Number(params.get('business_center_id'))
      : null,
    team_id: params.get('team_id') ? Number(params.get('team_id')) : null,
    status: params.get('status'),
    order_by: params.get('order_by') as AccountFilterParams['order_by'],
    order: params.get('order') as AccountFilterParams['order'],
  }
}

function buildParams(
  filters: AccountFilterParams,
  pagination: TablePaginationState,
): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.query) params.set('query', filters.query)
  if (filters.ads_type) params.set('ads_type', filters.ads_type)
  if (filters.business_center_id != null)
    params.set('business_center_id', String(filters.business_center_id))
  if (filters.team_id != null) params.set('team_id', String(filters.team_id))
  if (filters.status) params.set('status', filters.status)
  if (filters.order_by) params.set('order_by', filters.order_by)
  if (filters.order) params.set('order', filters.order)
  setPaginationInParams(params, pagination)
  return params
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
  const canAssign = useMemo(() => hasPermission(perms, PermissionSlugs.AccountsAssign), [perms])

  const [data, setData] = useState<Account[]>([])
  const [businessCenterOptions, setBusinessCenterOptions] = useState<SearchableSelectOption[]>([])
  const [teamOptions, setTeamOptions] = useState<SearchableSelectOption[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const { filters, pagination, setPagination, onFilterReset, setFilters } =
    useTableUrlState<AccountFilterParams>({
      parseFilters,
      buildParams,
      defaultFilters: DEFAULT_FILTERS,
    })

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Account | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Account | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [updatingToggleKeys, setUpdatingToggleKeys] = useState<Set<string>>(new Set())

  const getToggleKey = useCallback(
    (id: number, field: 'is_special' | 'sync_to_mcc') => `${id}:${field}`,
    [],
  )

  const [refreshSignal, setRefreshSignal] = useState(0)
  const loadData = useCallback(() => setRefreshSignal((s) => s + 1), [])

  useEffect(() => {
    let ignore = false
    const fetchData = async () => {
      try {
        setLoading(true)
        const { data: res } = await accountsApi.list({
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

  const onFilterChange = useCallback(
    (patch: Partial<AccountFilterParams>) => {
      const hasBusinessCenterId = Object.prototype.hasOwnProperty.call(patch, 'business_center_id')
      const hasTeamId = Object.prototype.hasOwnProperty.call(patch, 'team_id')

      setFilters((prev) => ({
        ...prev,
        ...patch,
        business_center_id: hasBusinessCenterId
          ? normalizeNumber(patch.business_center_id)
          : prev.business_center_id,
        team_id: hasTeamId ? normalizeNumber(patch.team_id) : prev.team_id,
      }))
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    },
    [setFilters, setPagination],
  )

  const onSortingChange = useCallback(
    (orderBy: string | null, order: 'asc' | 'desc' | null) => {
      setFilters((prev) => ({
        ...prev,
        order_by: (orderBy as AccountFilterParams['order_by']) ?? null,
        order: order ?? null,
      }))
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    },
    [setFilters, setPagination],
  )

  const onAddClick = useCallback(() => {
    setCreateOpen(true)
  }, [])

  const onEditRow = useCallback((row: Account) => {
    setEditTarget(row)
  }, [])

  const onDeleteRow = useCallback((row: Account) => {
    setDeleteTarget(row)
  }, [])

  const onToggleField = useCallback(
    async (row: Account, field: 'is_special' | 'sync_to_mcc', checked: boolean) => {
      const key = getToggleKey(row.id, field)

      setUpdatingToggleKeys((prev) => {
        const next = new Set(prev)
        next.add(key)
        return next
      })

      try {
        const { data: response } = await accountsApi.update(row.id, {
          account_id: row.account_id,
          account_name: row.account_name,
          ads_type: row.ads_type,
          business_center_id: row.business_center_id,
          team_id: row.team_id,
          status: row.status,
          is_special: field === 'is_special' ? checked : row.is_special,
          sync_to_mcc: field === 'sync_to_mcc' ? checked : row.sync_to_mcc,
        })

        setData((prev) => prev.map((item) => (item.id === row.id ? response.data : item)))
        toast.success(
          `${field === 'is_special' ? 'Special' : 'Sync to MCC'} updated to ${checked ? 'On' : 'Off'}`,
        )
      } catch (err) {
        toast.error(formatApiError(err))
      } finally {
        setUpdatingToggleKeys((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    },
    [getToggleKey],
  )

  const isFieldUpdating = useCallback(
    (rowId: number, field: 'is_special' | 'sync_to_mcc') =>
      updatingToggleKeys.has(getToggleKey(rowId, field)),
    [getToggleKey, updatingToggleKeys],
  )

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
      <AccountsTableCard
        data={data}
        businessCenterOptions={businessCenterOptions}
        teamOptions={teamOptions}
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
        canAssign={canAssign}
        onAddClick={onAddClick}
        onEditRow={onEditRow}
        onDeleteRow={onDeleteRow}
        onToggleField={onToggleField}
        isFieldUpdating={isFieldUpdating}
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

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { campaignRuleSettingsApi } from '@/features/campaign-rule-settings/api'
import { CampaignRuleSettingsList } from '@/features/campaign-rule-settings/components'
import type {
  CampaignRuleSettingsFilterParams,
  CampaignRuleSettingsUser,
  SaveCampaignRuleSettingPayload,
} from '@/features/campaign-rule-settings/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { formatApiError } from '@/features/settings/components'
import { useTableUrlState } from '@/hooks/useTableUrlState'
import { setPaginationInParams, type TablePaginationState } from '@/lib/utils'

const DEFAULT_FILTERS: CampaignRuleSettingsFilterParams = {
  order_by: 'created_at',
  order: 'desc',
}

function parseFilters(params: URLSearchParams): CampaignRuleSettingsFilterParams {
  return {
    order_by:
      (params.get('order_by') as CampaignRuleSettingsFilterParams['order_by']) ?? 'created_at',
    order: (params.get('order') as CampaignRuleSettingsFilterParams['order']) ?? 'desc',
  }
}

function buildParams(
  filters: CampaignRuleSettingsFilterParams,
  pagination: TablePaginationState,
): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.order_by) params.set('order_by', filters.order_by)
  if (filters.order) params.set('order', filters.order)
  setPaginationInParams(params, pagination, 10)
  return params
}

export function CampaignRuleSettingsPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])
  const canUpdate = useMemo(
    () => hasPermission(perms, PermissionSlugs.CampaignRuleSettingsUpdate),
    [perms],
  )

  const [users, setUsers] = useState<CampaignRuleSettingsUser[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [updatingUserIds, setUpdatingUserIds] = useState<Set<number>>(new Set())

  const { filters, pagination, setPagination, setFilters } =
    useTableUrlState<CampaignRuleSettingsFilterParams>({
      parseFilters,
      buildParams,
      defaultFilters: DEFAULT_FILTERS,
      defaultPageSize: 10,
    })

  useEffect(() => {
    let ignore = false
    const fetchData = async () => {
      try {
        setLoading(true)
        const { data: res } = await campaignRuleSettingsApi.list({
          ...filters,
          page: pagination.pageIndex + 1,
          per_page: pagination.pageSize,
        })
        if (!ignore) {
          setUsers(res.data)
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
  }, [pagination.pageIndex, pagination.pageSize, filters])

  // Wraps both sorting/filter changes and pagination changes coming from the list component
  const onFilterChange = useCallback(
    (patch: Partial<CampaignRuleSettingsFilterParams>) => {
      const { page, per_page, ...rest } = patch as CampaignRuleSettingsFilterParams & {
        page?: number
        per_page?: number
      }
      if (page !== undefined || per_page !== undefined) {
        setPagination((prev) => ({
          pageIndex: page !== undefined ? page - 1 : prev.pageIndex,
          pageSize: per_page !== undefined ? per_page : prev.pageSize,
        }))
      }
      if (Object.keys(rest).length > 0) {
        setFilters((prev) => ({ ...prev, ...rest }))
        if (page === undefined) setPagination((prev) => ({ ...prev, pageIndex: 0 }))
      }
    },
    [setFilters, setPagination],
  )

  const onSaveRow = useCallback(async (userId: number, payload: SaveCampaignRuleSettingPayload) => {
    setUpdatingUserIds((prev) => {
      const next = new Set(prev)
      next.add(userId)
      return next
    })

    try {
      const { data: response } = await campaignRuleSettingsApi.save(userId, payload)
      setUsers((prev) => prev.map((item) => (item.id === userId ? response.data : item)))
      toast.success('Campaign rule setting updated')
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setUpdatingUserIds((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }, [])

  const apiFilters = { ...filters, page: pagination.pageIndex + 1, per_page: pagination.pageSize }

  return (
    <CampaignRuleSettingsList
      users={users}
      loading={loading}
      rowCount={rowCount}
      filters={apiFilters}
      canUpdate={canUpdate}
      updatingUserIds={updatingUserIds}
      onFilterChange={onFilterChange}
      onSaveRow={onSaveRow}
    />
  )
}

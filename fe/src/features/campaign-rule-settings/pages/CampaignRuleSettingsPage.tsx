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

const DEFAULT_FILTERS: CampaignRuleSettingsFilterParams = {
  order_by: 'created_at',
  order: 'desc',
  page: 1,
  per_page: 10,
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
  const [filters, setFilters] = useState<CampaignRuleSettingsFilterParams>(DEFAULT_FILTERS)
  const [updatingUserIds, setUpdatingUserIds] = useState<Set<number>>(new Set())

  const loadData = useCallback(async (activeFilters: CampaignRuleSettingsFilterParams) => {
    try {
      setLoading(true)
      const { data } = await campaignRuleSettingsApi.list(activeFilters)
      setUsers(data.data)
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

  const onFilterChange = useCallback((patch: Partial<CampaignRuleSettingsFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
  }, [])

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

  return (
    <CampaignRuleSettingsList
      users={users}
      loading={loading}
      rowCount={rowCount}
      filters={filters}
      canUpdate={canUpdate}
      updatingUserIds={updatingUserIds}
      onFilterChange={onFilterChange}
      onSaveRow={onSaveRow}
    />
  )
}

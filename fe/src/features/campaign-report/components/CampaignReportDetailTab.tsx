import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  FilterPanel,
  type FilterFieldDef,
  type SelectOption,
} from '@/components/common/FilterPanel'
import type { DateRangeValue } from '@/components/ui/date-range-picker-presets'
import { campaignReportApi } from '@/features/campaign-report/api'
import { CampaignReportTableCard } from '@/features/campaign-report/components/CampaignReportTableCard'
import { formatApiError } from '@/features/settings/components'
import type {
  CampaignReportFilterParams,
  CampaignReportFiltersResponse,
  CampaignReportListResponse,
  CampaignReportOrder,
  CampaignReportOrderBy,
  CampaignReportRow,
  CampaignReportSummary,
} from '@/features/campaign-report/types'
import type { RBACRole } from '@/shared/types'

type Props = {
  campaignId: string
  initialFilters: CampaignReportFilterParams
  filterOptions: CampaignReportFiltersResponse['data']
  userPermissions: string[]
  role: RBACRole
  onOpenCampaign: (campaign: CampaignReportRow) => void
  onFiltersChange: (filters: CampaignReportFilterParams) => void
  workspaceTabs: ReactNode
}

function parseDateRange(value: unknown): DateRangeValue | null {
  if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
    const next = value as DateRangeValue
    return { from: next.from ?? null, to: next.to ?? null }
  }
  return null
}

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function parseNumberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.map((item) => Number(item)).filter((item) => !Number.isNaN(item))
    : []
}

function parseStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value !== '__none__' ? value : null
}

export function CampaignReportDetailTab({
  campaignId,
  initialFilters,
  filterOptions,
  userPermissions,
  role,
  onOpenCampaign,
  onFiltersChange,
  workspaceTabs,
}: Props) {
  const [filters, setFilters] = useState<CampaignReportFilterParams>(() => ({
    ...initialFilters,
    campaign_ids: [campaignId],
  }))
  const [rows, setRows] = useState<CampaignReportRow[]>([])
  const [toggling, setToggling] = useState<Record<string, boolean>>({})
  const [rowCount, setRowCount] = useState(0)
  const [summary, setSummary] = useState<CampaignReportSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const latestLoadId = useRef(0)

  const userOptions = useMemo<SelectOption[]>(
    () => filterOptions.users.map((user) => ({ value: String(user.id), label: user.name })),
    [filterOptions.users],
  )
  const accountOptions = useMemo<SelectOption[]>(
    () =>
      filterOptions.accounts.map((account) => ({
        value: account.account_id,
        label: account.account_name
          ? `${account.account_name} (${account.account_id})`
          : account.account_id,
      })),
    [filterOptions.accounts],
  )
  const adsTypeOptions = useMemo<SelectOption[]>(
    () => filterOptions.ads_types.map((type) => ({ value: type.value, label: type.label })),
    [filterOptions.ads_types],
  )
  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'date_range',
        label: 'Date Range',
        type: 'daterange',
        value: { from: filters.date_from ?? null, to: filters.date_to ?? null },
        placeholder: 'Select date range',
      },
      {
        field: 'keyword',
        label: 'Search',
        type: 'input',
        value: filters.keyword ?? null,
        placeholder: 'Campaign, account, or Ads Link...',
      },
      {
        field: 'user_ids',
        label: 'User',
        type: 'multiselect',
        hidden: role.isMember,
        value: (filters.user_ids ?? []).map(String),
        options: userOptions,
        placeholder: 'All users',
      },
      {
        field: 'account_ids',
        label: 'Account Ads',
        type: 'multiselect',
        value: (filters.account_ids ?? []).map(String),
        options: accountOptions,
        placeholder: 'All accounts',
      },
      {
        field: 'ads_type',
        label: 'Ads Type',
        type: 'select',
        value: filters.ads_type ?? null,
        options: adsTypeOptions,
        placeholder: 'All types',
      },
    ],
    [accountOptions, adsTypeOptions, filters, role, userOptions],
  )

  const loadData = useCallback(async (activeFilters: CampaignReportFilterParams) => {
    const loadId = ++latestLoadId.current
    try {
      setLoading(true)
      const response = await campaignReportApi.list(activeFilters)
      const data: CampaignReportListResponse = response.data
      if (loadId !== latestLoadId.current) return
      setRows(data.data)
      setRowCount(data.pagination.total)
      setSummary(data.grand_summary)
    } catch (error) {
      if (loadId === latestLoadId.current) toast.error(formatApiError(error))
    } finally {
      if (loadId === latestLoadId.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData(filters)
  }, [filters, loadData])

  useEffect(() => {
    onFiltersChange(filters)
  }, [filters, onFiltersChange])

  const onToggleCampaignStatus = useCallback(async (id: string, checked: boolean) => {
    const status: 'ACTIVE' | 'PAUSED' = checked ? 'ACTIVE' : 'PAUSED'
    setToggling((previous) => ({ ...previous, [id]: true }))
    try {
      const { data } = await campaignReportApi.toggleStatus(id, status)
      setRows((previous) =>
        previous.map((row) =>
          row.campaign_id === id ? { ...row, campaign_status: data.data.status } : row,
        ),
      )
      toast.success(`Campaign is now ${data.data.status}`)
    } catch (error) {
      toast.error(formatApiError(error))
    } finally {
      setToggling((previous) => ({ ...previous, [id]: false }))
    }
  }, [])

  const onApplyFilters = useCallback(
    (values: Record<string, unknown>) => {
      const range = parseDateRange(values.date_range)
      setFilters((previous) => ({
        ...previous,
        date_from: range?.from ?? null,
        date_to: range?.to ?? null,
        keyword: parseStringOrNull(values.keyword),
        user_ids: parseNumberArray(values.user_ids),
        account_ids: parseStringArray(values.account_ids),
        ads_type: parseStringOrNull(values.ads_type),
        campaign_ids: [campaignId],
        page: 1,
      }))
    },
    [campaignId],
  )

  const onResetFilters = useCallback(() => {
    setFilters({
      date_from: null,
      date_to: null,
      keyword: null,
      user_ids: [],
      account_ids: [],
      ads_type: null,
      campaign_ids: [campaignId],
      page: 1,
      per_page: 30,
    })
  }, [campaignId])

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 shrink-0">
        <FilterPanel
          fields={filterFields}
          onReset={onResetFilters}
          applyMode
          onApply={onApplyFilters}
        />
      </div>
      <div className="shrink-0">{workspaceTabs}</div>
      <div className="min-h-0 flex-1">
        <CampaignReportTableCard
          data={rows}
          rowCount={rowCount}
          loading={loading}
          filters={filters}
          filterOptions={filterOptions}
          summary={summary}
          toggling={toggling}
          userPermissions={userPermissions}
          onPaginationChange={(page, perPage) =>
            setFilters((previous) => ({ ...previous, page, per_page: perPage }))
          }
          onSortingChange={(
            orderBy: CampaignReportOrderBy | null,
            order: CampaignReportOrder | null,
          ) =>
            setFilters((previous) => ({
              ...previous,
              order_by: orderBy ?? undefined,
              order: order ?? undefined,
              page: 1,
            }))
          }
          onToggleCampaignStatus={(id, checked) => void onToggleCampaignStatus(id, checked)}
          onOpenCampaign={onOpenCampaign}
          role={role}
        />
      </div>
    </div>
  )
}

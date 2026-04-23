import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { toast } from 'sonner'

import { campaignReportApi } from '@/features/campaign-report/api'
import { CampaignReportTableCard } from '@/features/campaign-report/components'
import type {
  CampaignReportDataRow,
  CampaignReportFilterParams,
  CampaignReportFiltersResponse,
  CampaignReportGroupBy,
  CampaignReportListResponse,
  CampaignReportOrder,
  CampaignReportOrderBy,
  CampaignReportRow,
  CampaignReportSummary,
} from '@/features/campaign-report/types'
import {
  FilterPanel,
  type FilterFieldDef,
  type SelectOption,
} from '@/components/common/FilterPanel'
import type { DateRangeValue } from '@/components/ui/date-range-picker-presets'
import { formatApiError } from '@/features/settings/components'
import { useAuthStore } from '@/hooks/useAuthStore'

type FilterOptions = CampaignReportFiltersResponse['data']

const DEFAULT_FILTERS: CampaignReportFilterParams = {
  date_from: dayjs().startOf('month').format('YYYY-MM-DD'),
  date_to: dayjs().endOf('month').format('YYYY-MM-DD'),
  user_ids: [],
  account_ids: [],
  ads_type: null,
  campaign_ids: [],
  channel_codes: [],
  link_data_ids: [],
  group_by: 'channel_code',
  page: 1,
  per_page: 30,
}

const EMPTY_OPTIONS: FilterOptions = {
  users: [],
  accounts: [],
  campaigns: [],
  channels: [],
  link_data_ids: [],
  ads_types: [],
}

const GROUP_BY_OPTIONS: SelectOption[] = [
  { value: '__none__', label: 'No grouping' },
  { value: 'channel_code', label: 'Channel' },
  { value: 'account_id', label: 'Account' },
  { value: 'user_id', label: 'User' },
  { value: 'campaign_id', label: 'Campaign' },
]

function parseDateRange(value: unknown): DateRangeValue | null {
  if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
    const next = value as DateRangeValue
    return { from: next.from ?? null, to: next.to ?? null }
  }
  return null
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string')
}

function parseNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => Number(v)).filter((n) => !Number.isNaN(n))
}

function parseStringOrNull(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0 && value !== '__none__') return value
  return null
}

function parseGroupBy(value: unknown): CampaignReportGroupBy {
  if (typeof value !== 'string' || value === '__none__') return ''
  const allowed: CampaignReportGroupBy[] = ['channel_code', 'account_id', 'user_id', 'campaign_id']
  return (allowed as string[]).includes(value) ? (value as CampaignReportGroupBy) : ''
}

export function CampaignReportPage() {
  const [filters, setFilters] = useState<CampaignReportFilterParams>(DEFAULT_FILTERS)

  const userPermissions = useAuthStore((s) => s.user?.permissions ?? [])

  const [options, setOptions] = useState<FilterOptions>(EMPTY_OPTIONS)

  const [rows, setRows] = useState<CampaignReportDataRow[]>([])
  const [toggling, setToggling] = useState<Record<string, boolean>>({})
  const [rowCount, setRowCount] = useState(0)
  const [grandSummary, setGrandSummary] = useState<CampaignReportSummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    campaignReportApi
      .filters()
      .then((res) => {
        if (cancelled) return
        setOptions(res.data.data)
      })
      .catch((err) => {
        toast.error(formatApiError(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loadData = useCallback(async (activeFilters: CampaignReportFilterParams) => {
    try {
      setLoading(true)
      const { data }: { data: CampaignReportListResponse } =
        await campaignReportApi.list(activeFilters)
      setRows(data.data)
      setRowCount(data.pagination.total)
      setGrandSummary(data.grand_summary)
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData(filters)
  }, [loadData, filters])

  const onToggleCampaignStatus = useCallback(async (campaignId: string, checked: boolean) => {
    const next: 'ACTIVE' | 'PAUSED' = checked ? 'ACTIVE' : 'PAUSED'

    setToggling((prev) => ({ ...prev, [campaignId]: true }))
    try {
      const { data } = await campaignReportApi.toggleStatus(campaignId, next)
      const updatedStatus = data.data.status

      const applyStatus = (r: CampaignReportRow): CampaignReportRow =>
        r.campaign_id === campaignId ? { ...r, campaign_status: updatedStatus } : r

      setRows((prev) =>
        prev.map((row) => {
          if ('is_group' in row && row.is_group === true) {
            return { ...row, items: row.items.map(applyStatus) }
          }
          return applyStatus(row as CampaignReportRow)
        }),
      )

      toast.success(`Campaign is now ${updatedStatus}`)
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setToggling((prev) => ({ ...prev, [campaignId]: false }))
    }
  }, [])

  const handleToggleCampaignStatus = useCallback(
    (campaignId: string, checked: boolean) => {
      void onToggleCampaignStatus(campaignId, checked)
    },
    [onToggleCampaignStatus],
  )

  const onApplyFilters = useCallback((values: Record<string, unknown>) => {
    const range = parseDateRange(values.date_range)
    setFilters((prev) => ({
      ...prev,
      date_from: range?.from ?? null,
      date_to: range?.to ?? null,
      user_ids: parseNumberArray(values.user_ids),
      account_ids: parseNumberArray(values.account_ids),
      ads_type: parseStringOrNull(values.ads_type),
      campaign_ids: parseStringArray(values.campaign_ids),
      channel_codes: parseStringArray(values.channel_codes),
      link_data_ids: parseNumberArray(values.link_data_ids),
      group_by: parseGroupBy(values.group_by),
      page: 1,
    }))
  }, [])

  const onResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const onPaginationChange = useCallback((page: number, perPage: number) => {
    setFilters((prev) => ({ ...prev, page, per_page: perPage }))
  }, [])

  const onSortingChange = useCallback(
    (orderBy: CampaignReportOrderBy | null, order: CampaignReportOrder | null) => {
      setFilters((prev) => ({
        ...prev,
        order_by: orderBy ?? undefined,
        order: order ?? undefined,
        page: 1,
      }))
    },
    [],
  )

  const userOptions = useMemo<SelectOption[]>(
    () => options.users.map((u) => ({ value: String(u.id), label: u.name })),
    [options.users],
  )

  const accountOptions = useMemo<SelectOption[]>(
    () =>
      options.accounts.map((a) => ({
        value: String(a.id),
        label: a.account_name ? `${a.account_name} (${a.account_id})` : a.account_id,
      })),
    [options.accounts],
  )

  const campaignOptions = useMemo<SelectOption[]>(
    () =>
      options.campaigns.map((c) => ({
        value: c.campaign_id,
        label: c.campaign_name ? `${c.campaign_name} (${c.campaign_id})` : c.campaign_id,
      })),
    [options.campaigns],
  )

  const channelOptions = useMemo<SelectOption[]>(
    () =>
      options.channels.map((c) => ({
        value: c.code,
        label: c.name ? `${c.name} (${c.code})` : c.code,
      })),
    [options.channels],
  )

  const linkDataOptions = useMemo<SelectOption[]>(
    () =>
      options.link_data_ids.map((l) => {
        const parts = [String(l.id)]
        if (l.campaign_id) parts.push(l.campaign_id)
        return {
          value: String(l.id),
          label: parts.join(' · '),
        }
      }),
    [options.link_data_ids],
  )

  const adsTypeOptions = useMemo<SelectOption[]>(
    () => options.ads_types.map((t) => ({ value: t.value, label: t.label })),
    [options.ads_types],
  )

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'date_range',
        label: 'Date Range',
        type: 'daterange',
        value: {
          from: filters.date_from ?? null,
          to: filters.date_to ?? null,
        },
        placeholder: 'Select date range',
      },
      {
        field: 'user_ids',
        label: 'User',
        type: 'multiselect',
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
      {
        field: 'campaign_ids',
        label: 'Campaign',
        type: 'multiselect',
        value: filters.campaign_ids ?? [],
        options: campaignOptions,
        placeholder: 'All campaigns',
      },
      {
        field: 'channel_codes',
        label: 'Channel',
        type: 'multiselect',
        value: filters.channel_codes ?? [],
        options: channelOptions,
        placeholder: 'All channels',
      },
      {
        field: 'link_data_ids',
        label: 'Link Tracking',
        type: 'multiselect',
        value: (filters.link_data_ids ?? []).map(String),
        options: linkDataOptions,
        placeholder: 'All links',
      },
      {
        field: 'group_by',
        label: 'Group By',
        type: 'select',
        value: filters.group_by ? filters.group_by : '__none__',
        options: GROUP_BY_OPTIONS,
        placeholder: 'No grouping',
        hideAllOption: true,
      },
    ],
    [
      filters,
      userOptions,
      accountOptions,
      adsTypeOptions,
      campaignOptions,
      channelOptions,
      linkDataOptions,
    ],
  )

  return (
    <div className="flex flex-col gap-6">
      <FilterPanel
        fields={filterFields}
        onReset={onResetFilters}
        applyMode
        onApply={onApplyFilters}
      />

      <CampaignReportTableCard
        data={rows}
        rowCount={rowCount}
        loading={loading}
        filters={filters}
        filterOptions={options}
        summary={grandSummary}
        toggling={toggling}
        userPermissions={userPermissions}
        onPaginationChange={onPaginationChange}
        onSortingChange={onSortingChange}
        onToggleCampaignStatus={handleToggleCampaignStatus}
      />
    </div>
  )
}

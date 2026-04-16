import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'

import { adsReportApi } from '@/features/ads-report/api'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import type { DateRangeValue } from '@/components/ui/date-range-picker-presets'
import { AdsReportSummaryCards } from '@/features/ads-report/components'
import { formatApiError } from '@/features/settings/components'
import type {
  AdsReportFilterOption,
  AdsReportFilterOptions,
  AdsReportFilterParams,
  AdsReportListResponse,
  AdsReportOrderBy,
  AdsReportRow,
  AdsReportSummary,
  AdsReportType,
} from '@/features/ads-report/types'
import type { SearchableSelectOption } from '@/components/common/SearchableSelect'

const DEFAULT_DATE_FROM = dayjs().startOf('month').format('YYYY-MM-DD')
const DEFAULT_DATE_TO = dayjs().endOf('month').format('YYYY-MM-DD')

const DEFAULT_FILTERS: AdsReportFilterParams = {
  date_from: DEFAULT_DATE_FROM,
  date_to: DEFAULT_DATE_TO,
}

const MOCK_ROWS: AdsReportRow[] = [
  {
    id: 1,
    date: '2026-04-15',
    main_team_id: 1,
    main_team_name: 'Team Alpha',
    type: 'facebook',
    account_id: 101,
    account_name: 'Growth FB',
    campaign_id: 1001,
    campaign_name: 'Scale Spring Sale',
    status: 'active',
    spend: 145.2,
    revenue: 325.9,
    impressions: 56320,
    clicks: 1490,
    reach: 31200,
  },
  {
    id: 2,
    date: '2026-04-15',
    main_team_id: 2,
    main_team_name: 'Team Beta',
    type: 'google',
    account_id: 201,
    account_name: 'Search Core',
    campaign_id: 2001,
    campaign_name: 'Brand Search VN',
    status: 'paused',
    spend: 83.15,
    revenue: 102.7,
    impressions: 34810,
    clicks: 908,
    reach: 21040,
  },
  {
    id: 3,
    date: '2026-04-14',
    main_team_id: 1,
    main_team_name: 'Team Alpha',
    type: 'tiktok',
    account_id: 301,
    account_name: 'TikTok Creator',
    campaign_id: 3001,
    campaign_name: 'UGC Product Drop',
    status: 'archived',
    spend: 54.7,
    revenue: 48.3,
    impressions: 26700,
    clicks: 520,
    reach: 18200,
  },
  {
    id: 4,
    date: '2026-04-14',
    main_team_id: 3,
    main_team_name: 'Team Gamma',
    type: 'facebook',
    account_id: 102,
    account_name: 'Remarketing FB',
    campaign_id: 1002,
    campaign_name: 'Retarget Dynamic',
    status: 'active',
    spend: 126.8,
    revenue: 241.5,
    impressions: 49210,
    clicks: 1215,
    reach: 28010,
  },
  {
    id: 5,
    date: '2026-04-13',
    main_team_id: 2,
    main_team_name: 'Team Beta',
    type: 'google',
    account_id: 202,
    account_name: 'Display Pro',
    campaign_id: 2002,
    campaign_name: 'Display Prospecting',
    status: 'paused',
    spend: 96.4,
    revenue: 118.2,
    impressions: 40580,
    clicks: 844,
    reach: 23330,
  },
  {
    id: 6,
    date: '2026-04-12',
    main_team_id: 3,
    main_team_name: 'Team Gamma',
    type: 'other',
    account_id: 401,
    account_name: 'Affiliate Hub',
    campaign_id: 4001,
    campaign_name: 'Affiliate Push',
    status: 'active',
    spend: 42.3,
    revenue: 109.8,
    impressions: 18820,
    clicks: 430,
    reach: 13910,
  },
]

function deriveFilterOptions(rows: AdsReportRow[]): AdsReportFilterOptions {
  const unique = <K extends keyof AdsReportRow>(arr: AdsReportRow[], idKey: K, nameKey: K) => {
    const map = new Map<number, string>()
    arr.forEach((item) => {
      const idValue = item[idKey]
      const nameValue = item[nameKey]
      if (typeof idValue === 'number' && typeof nameValue === 'string') {
        map.set(idValue, nameValue)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }

  return {
    main_teams: unique(rows, 'main_team_id', 'main_team_name'),
    accounts: unique(rows, 'account_id', 'account_name'),
    campaigns: unique(rows, 'campaign_id', 'campaign_name'),
  }
}

function summarize(rows: AdsReportRow[]): AdsReportSummary {
  const total = rows.length
  const active = rows.filter((row) => row.status === 'active').length
  const paused = rows.filter((row) => row.status === 'paused').length
  const archived = rows.filter((row) => row.status === 'archived').length

  const totalSpend = rows.reduce((acc, row) => acc + row.spend, 0)
  const totalRevenue = rows.reduce((acc, row) => acc + row.revenue, 0)
  const totalImpressions = rows.reduce((acc, row) => acc + row.impressions, 0)
  const totalClicks = rows.reduce((acc, row) => acc + row.clicks, 0)
  const totalReach = rows.reduce((acc, row) => acc + row.reach, 0)

  return {
    campaign_total: total,
    campaign_active: active,
    campaign_paused: paused,
    campaign_archived: archived,
    total_spend: totalSpend,
    total_revenue: totalRevenue,
    total_profit: totalRevenue - totalSpend,
    total_impressions: totalImpressions,
    total_clicks: totalClicks,
    total_reach: totalReach,
  }
}

function compareByOrder(a: AdsReportRow, b: AdsReportRow, orderBy: AdsReportOrderBy) {
  switch (orderBy) {
    case 'date':
      return a.date.localeCompare(b.date)
    case 'campaign_name':
      return a.campaign_name.localeCompare(b.campaign_name)
    case 'status':
      return a.status.localeCompare(b.status)
    case 'spend':
      return a.spend - b.spend
    case 'revenue':
      return a.revenue - b.revenue
    case 'impressions':
      return a.impressions - b.impressions
    case 'clicks':
      return a.clicks - b.clicks
    case 'reach':
      return a.reach - b.reach
    default:
      return 0
  }
}

function getMockListResponse(filters: AdsReportFilterParams): AdsReportListResponse {
  const queryRows = MOCK_ROWS.filter((row) => {
    if (filters.date_from && row.date < filters.date_from) return false
    if (filters.date_to && row.date > filters.date_to) return false
    if (filters.main_team_id != null && row.main_team_id !== filters.main_team_id) return false
    if (filters.type && row.type !== filters.type) return false
    if (filters.account_id != null && row.account_id !== filters.account_id) return false
    if (filters.campaign_id != null && row.campaign_id !== filters.campaign_id) return false
    return true
  })

  const orderBy = filters.order_by ?? 'date'
  const order = filters.order ?? 'desc'
  const sorted = [...queryRows].sort((a, b) => {
    const result = compareByOrder(a, b, orderBy)
    return order === 'asc' ? result : -result
  })

  const page = filters.page ?? 1
  const perPage = filters.per_page ?? 20
  const start = (page - 1) * perPage
  const end = start + perPage

  const filteredRows = sorted.slice(start, end)

  return {
    data: filteredRows,
    summary: summarize(queryRows),
    options: deriveFilterOptions(MOCK_ROWS),
    pagination: {
      current_page: page,
      from: queryRows.length === 0 ? null : start + 1,
      to: queryRows.length === 0 ? null : Math.min(end, queryRows.length),
      last_page: Math.max(1, Math.ceil(queryRows.length / perPage)),
      last_page_url: null,
      next_page_url: null,
      path: '/ads-report',
      per_page: perPage,
      prev_page_url: null,
      total: queryRows.length,
    },
  }
}

function toSelectOptions(options: AdsReportFilterOption[]): SearchableSelectOption[] {
  return options.map((item) => ({ value: String(item.id), label: item.name }))
}

function parseNullableId(value: unknown): number | null | undefined {
  if (value == null || value === '') return undefined
  if (typeof value !== 'string') return undefined
  const parsed = Number(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function parseDateRange(value: unknown): DateRangeValue | null {
  if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
    const next = value as DateRangeValue
    return { from: next.from ?? null, to: next.to ?? null }
  }
  return null
}

export function AdsReportPage() {
  const [summary, setSummary] = useState<AdsReportSummary>(summarize(MOCK_ROWS))
  const [listError, setListError] = useState<string | null>(null)

  const [filters, setFilters] = useState<AdsReportFilterParams>(DEFAULT_FILTERS)

  const [mainTeamOptions, setMainTeamOptions] = useState<SearchableSelectOption[]>(
    toSelectOptions(deriveFilterOptions(MOCK_ROWS).main_teams),
  )
  const [accountOptions, setAccountOptions] = useState<SearchableSelectOption[]>(
    toSelectOptions(deriveFilterOptions(MOCK_ROWS).accounts),
  )
  const [campaignOptions, setCampaignOptions] = useState<SearchableSelectOption[]>(
    toSelectOptions(deriveFilterOptions(MOCK_ROWS).campaigns),
  )

  const loadData = useCallback(async (activeFilters: AdsReportFilterParams) => {
    try {
      setListError(null)

      const { data: response } = await adsReportApi.list(activeFilters)

      if (response.summary) {
        setSummary(response.summary)
      } else {
        setSummary(summarize(response.data))
      }

      if (response.options) {
        setMainTeamOptions(toSelectOptions(response.options.main_teams))
        setAccountOptions(toSelectOptions(response.options.accounts))
        setCampaignOptions(toSelectOptions(response.options.campaigns))
      }
    } catch (error) {
      const mocked = getMockListResponse(activeFilters)
      setSummary(mocked.summary ?? summarize(mocked.data))
      setMainTeamOptions(toSelectOptions(mocked.options?.main_teams ?? []))
      setAccountOptions(toSelectOptions(mocked.options?.accounts ?? []))
      setCampaignOptions(toSelectOptions(mocked.options?.campaigns ?? []))
      setListError(formatApiError(error))
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData(filters)
  }, [loadData, filters])

  const onFilterChange = useCallback((patch: Partial<AdsReportFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
  }, [])

  const onResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

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
        field: 'main_team_id',
        label: 'Main Team',
        type: 'select',
        value: filters.main_team_id != null ? String(filters.main_team_id) : null,
        options: mainTeamOptions,
        placeholder: 'All teams',
      },
      {
        field: 'type',
        label: 'Type',
        type: 'select',
        value: filters.type ?? null,
        options: [
          { value: 'facebook', label: 'Facebook' },
          { value: 'google', label: 'Google' },
          { value: 'tiktok', label: 'TikTok' },
          { value: 'other', label: 'Other' },
        ],
        placeholder: 'All types',
      },
      {
        field: 'account_id',
        label: 'Account',
        type: 'select',
        value: filters.account_id != null ? String(filters.account_id) : null,
        options: accountOptions,
        placeholder: 'All accounts',
      },
      {
        field: 'campaign_id',
        label: 'Campaign',
        type: 'select',
        value: filters.campaign_id != null ? String(filters.campaign_id) : null,
        options: campaignOptions,
        placeholder: 'All campaigns',
      },
    ],
    [filters, mainTeamOptions, accountOptions, campaignOptions],
  )

  const onApplyFilters = useCallback(
    (values: Record<string, unknown>) => {
      const range = parseDateRange(values.date_range)
      onFilterChange({
        date_from: range?.from ?? undefined,
        date_to: range?.to ?? undefined,
        main_team_id: parseNullableId(values.main_team_id),
        type: (values.type as AdsReportType | null) ?? undefined,
        account_id: parseNullableId(values.account_id),
        campaign_id: parseNullableId(values.campaign_id),
      })
    },
    [onFilterChange],
  )

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        {listError ? <p className="text-sm text-muted-foreground">({listError})</p> : null}
      </div>

      <FilterPanel
        fields={filterFields}
        onReset={onResetFilters}
        applyMode
        onApply={onApplyFilters}
      />

      <AdsReportSummaryCards summary={summary} />
    </div>
  )
}

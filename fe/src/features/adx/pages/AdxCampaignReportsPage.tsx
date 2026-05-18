import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import dayjs from '@/lib/dayjs'

import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  type MRT_ColumnDef,
  useMantineReactTable,
} from 'mantine-react-table'
import { BarChart3 } from 'lucide-react'

import {
  FilterPanel,
  type FilterFieldDef,
  type SelectOption,
} from '@/components/common/FilterPanel'
import { StatusPill } from '@/features/adx/components/AdxShared'
import { useIsMobile } from '@/hooks/useMobile'
import { useColumnVisibilityStorage } from '@/hooks/useColumnVisibilityStorage'
import type { DateRangeValue } from '@/components/ui/date-range-picker-presets'
import { adxApi } from '@/features/adx/api'
import { formatApiError } from '@/features/settings/components'
import type {
  AdxCampaignReport,
  AdxCampaignReportFiltersResponse,
  AdxCampaignReportFilterParams,
  AdxCampaignReportGroupBy,
  AdxCampaignReportOrderBy,
  SortDirection,
} from '@/features/adx/types'

const DEFAULT_PAGE_SIZE = 30

const DEFAULT_FILTERS: AdxCampaignReportFilterParams = {
  page: 1,
  per_page: DEFAULT_PAGE_SIZE,
  date_from: dayjs().format('YYYY-MM-DD'),
  date_to: dayjs().format('YYYY-MM-DD'),
  keyword: null,
  source: null,
  account_id: null,
  account_ids: [],
  campaign_id: null,
  campaign_ids: [],
  adx_link_data_id: null,
  adx_link_id: null,
  adx_link_ids: [],
  adx_game_id: null,
  adx_game_ids: [],
  group_by: '',
  order_by: 'date',
  order: 'desc',
}

const SOURCE_OPTIONS: SelectOption[] = [
  { value: 'google', label: 'Google' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'native', label: 'Native' },
  { value: 'other', label: 'Other' },
]

const GROUP_BY_OPTIONS: SelectOption[] = [
  { value: '__none__', label: 'No grouping' },
  { value: 'source', label: 'Source' },
  { value: 'account_id', label: 'Account' },
  { value: 'campaign_id', label: 'Campaign' },
  { value: 'adx_game_id', label: 'Game' },
  { value: 'adx_link_id', label: 'Link' },
  { value: 'adx_link_data_id', label: 'Link Data' },
]

const EMPTY_FILTER_OPTIONS: AdxCampaignReportFiltersResponse['data'] = {
  accounts: [],
  campaigns: [],
  games: [],
  links: [],
}

const SORTABLE_COLUMNS = new Set<AdxCampaignReportOrderBy>([
  'id',
  'date',
  'source',
  'account_id',
  'campaign_id',
  'spend',
  'revenue',
  'profit',
  'roi',
  'roas',
  'landing_view',
  'get_game_link_click',
  'detail_view',
  'get_bonus_click',
  'created_at',
])

const MONEY_FIELDS = ['daily_budget', 'lifetime_budget', 'spend', 'revenue', 'profit'] as const
const COUNT_FIELDS = [
  'ads_clicks',
  'ads_impressions',
  'landing_view',
  'get_game_link_click',
  'detail_view',
  'get_bonus_click',
  'adx_requests',
  'adx_matched_requests',
  'adx_impressions',
  'adx_viewable_impressions',
  'adx_clicks',
] as const

type MoneyField = (typeof MONEY_FIELDS)[number]
type CountField = (typeof COUNT_FIELDS)[number]
type RatioField = 'roi' | 'roas' | 'cpc' | 'epc' | 'rpm'
type MetricField = MoneyField | CountField | RatioField
type MetricTone = 'green' | 'blue' | 'yellow'

type AdxCampaignReportSummary = Record<MetricField, number>

type AdxCampaignReportGroupRow = {
  id: string
  is_group: true
  group_by: AdxCampaignReportGroupBy
  group_key: string
  group_label: string
  group_summary: AdxCampaignReportSummary
  items: AdxCampaignReport[]
}

type TableRow = AdxCampaignReport | AdxCampaignReportGroupRow

function isGroupRow(row: TableRow): row is AdxCampaignReportGroupRow {
  return typeof row === 'object' && row !== null && 'is_group' in row && row.is_group === true
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const next = Number(value)
    return Number.isFinite(next) ? next : 0
  }
  return 0
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  return dayjs(value).format('DD/MM/YYYY')
}

function formatMoney(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function formatDecimal(value: number, digits = 2): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function formatPercent(value: number): string {
  return `${formatDecimal(value, 2)}%`
}

function parseDateRange(value: unknown): DateRangeValue | null {
  if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
    const next = value as DateRangeValue
    return { from: next.from ?? null, to: next.to ?? null }
  }
  return null
}

function parseStringOrNull(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0 && value !== '__none__') {
    return value.trim()
  }
  return null
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function parseNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => Number(item)).filter((item) => Number.isFinite(item))
}

function parseGroupBy(value: unknown): AdxCampaignReportGroupBy {
  if (typeof value !== 'string' || value === '__none__') return ''
  const allowed: AdxCampaignReportGroupBy[] = [
    'account_id',
    'campaign_id',
    'adx_game_id',
    'adx_link_id',
    'adx_link_data_id',
  ]
  return (allowed as string[]).includes(value) ? (value as AdxCampaignReportGroupBy) : ''
}

function buildSummary(rows: AdxCampaignReport[]): AdxCampaignReportSummary {
  const summary = {
    daily_budget: 0,
    lifetime_budget: 0,
    spend: 0,
    revenue: 0,
    profit: 0,
    ads_clicks: 0,
    ads_impressions: 0,
    landing_view: 0,
    get_game_link_click: 0,
    detail_view: 0,
    get_bonus_click: 0,
    adx_requests: 0,
    adx_matched_requests: 0,
    adx_impressions: 0,
    adx_viewable_impressions: 0,
    adx_clicks: 0,
    roi: 0,
    roas: 0,
    cpc: 0,
    epc: 0,
    rpm: 0,
  } satisfies AdxCampaignReportSummary

  for (const row of rows) {
    for (const field of MONEY_FIELDS) summary[field] += toNumber(row[field])
    for (const field of COUNT_FIELDS) summary[field] += toNumber(row[field])
  }

  summary.profit = summary.revenue - summary.spend
  summary.roi = summary.spend > 0 ? (summary.profit / summary.spend) * 100 : 0
  summary.roas = summary.spend > 0 ? summary.revenue / summary.spend : 0
  summary.cpc = summary.ads_clicks > 0 ? summary.spend / summary.ads_clicks : 0
  summary.epc = summary.adx_clicks > 0 ? summary.revenue / summary.adx_clicks : 0
  summary.rpm = summary.adx_impressions > 0 ? (summary.revenue / summary.adx_impressions) * 1000 : 0

  return summary
}

function getMetric(row: TableRow, field: MetricField): number {
  if (isGroupRow(row)) return row.group_summary[field]
  return toNumber(row[field])
}

function getGroupKey(row: AdxCampaignReport, groupBy: AdxCampaignReportGroupBy): string {
  if (!groupBy) return ''
  const value = row[groupBy]
  return value === null || value === undefined || value === '' ? 'unknown' : String(value)
}

function getGroupLabel(row: AdxCampaignReport, groupBy: AdxCampaignReportGroupBy): string {
  switch (groupBy) {
    case 'account_id':
      return row.account_name
        ? `${row.account_name} (${row.account_id ?? 'unknown'})`
        : (row.account_id ?? 'Unknown account')
    case 'campaign_id':
      return row.campaign_name
        ? `${row.campaign_name} (${row.campaign_id ?? 'unknown'})`
        : (row.campaign_id ?? 'Unknown campaign')
    case 'adx_game_id':
      return row.game?.name ? `${row.game.name} (#${row.adx_game_id})` : `Game #${row.adx_game_id}`
    case 'adx_link_id':
      return row.link?.name ? `${row.link.name} (#${row.adx_link_id})` : `Link #${row.adx_link_id}`
    case 'adx_link_data_id':
      return `Link Data #${row.adx_link_data_id ?? 'unknown'}`
    default:
      return 'No grouping'
  }
}

function groupRows(rows: AdxCampaignReport[], groupBy: AdxCampaignReportGroupBy): TableRow[] {
  if (!groupBy) return rows

  const groups = new Map<string, { label: string; items: AdxCampaignReport[] }>()

  for (const row of rows) {
    const key = getGroupKey(row, groupBy)
    const current = groups.get(key)
    if (current) {
      current.items.push(row)
    } else {
      groups.set(key, { label: getGroupLabel(row, groupBy), items: [row] })
    }
  }

  return Array.from(groups.entries()).map(([key, group]) => ({
    id: `group:${groupBy}:${key}`,
    is_group: true,
    group_by: groupBy,
    group_key: key,
    group_label: group.label,
    group_summary: buildSummary(group.items),
    items: group.items,
  }))
}

function HeaderLabel({ tone, children }: { tone?: MetricTone; children: React.ReactNode }) {
  const toneClass =
    tone === 'green'
      ? 'bg-emerald-500'
      : tone === 'blue'
        ? 'bg-blue-500'
        : tone === 'yellow'
          ? 'bg-amber-400'
          : null

  return (
    <div className="flex min-h-[20px] items-center gap-1 whitespace-nowrap">
      {toneClass && <span className={`size-1.5 shrink-0 rounded-full ${toneClass}`} />}
      <span className="leading-tight font-bold">{children}</span>
    </div>
  )
}

function metricFooter(
  summary: AdxCampaignReportSummary | null,
  field: MetricField,
  formatter: (value: number) => string,
) {
  if (!summary) return null
  const text = formatter(summary[field])
  return (
    <span className="tabular-nums text-[10px] font-semibold whitespace-nowrap" title={text}>
      {text}
    </span>
  )
}

function makeMetricCol(
  field: MetricField,
  header: string,
  size: number,
  summary: AdxCampaignReportSummary | null,
  formatter: (value: number) => string,
  tone: MetricTone,
): MRT_ColumnDef<TableRow> {
  return {
    accessorKey: field,
    header,
    Header: <HeaderLabel tone={tone}>{header}</HeaderLabel>,
    size,
    minSize: size,
    enableSorting: SORTABLE_COLUMNS.has(field as AdxCampaignReportOrderBy),
    Cell: ({ row }) => {
      const text = formatter(getMetric(row.original, field))
      return (
        <span
          className="block whitespace-nowrap tabular-nums text-[10px] text-foreground"
          title={text}
        >
          {text}
        </span>
      )
    },
    Footer: () => metricFooter(summary, field, formatter),
  }
}

function getColumns(summary: AdxCampaignReportSummary | null): MRT_ColumnDef<TableRow>[] {
  const money = (field: MoneyField, header: string, size: number) =>
    makeMetricCol(field, header, size, summary, formatMoney, 'blue')
  const revenue = (field: MetricField, header: string, size: number) =>
    makeMetricCol(
      field,
      header,
      size,
      summary,
      field === 'roi'
        ? formatPercent
        : field === 'revenue' || field === 'profit'
          ? formatMoney
          : formatDecimal,
      'yellow',
    )
  const count = (field: CountField, header: string, size: number) =>
    makeMetricCol(field, header, size, summary, (value) => formatDecimal(value, 0), 'green')
  const costRatio = (field: RatioField, header: string, size: number) =>
    makeMetricCol(field, header, size, summary, formatDecimal, 'blue')

  return [
    {
      id: 'group_label',
      header: 'Group',
      Header: <HeaderLabel>Group</HeaderLabel>,
      size: 320,
      minSize: 320,
      enableSorting: false,
      Cell: ({ row }) => {
        if (!isGroupRow(row.original)) return null
        return (
          <div className="flex flex-col gap-0.5">
            <span
              className="block whitespace-nowrap text-xs font-semibold"
              title={row.original.group_label}
            >
              {row.original.group_label}
            </span>
            <span className="block whitespace-nowrap text-[10px] text-muted-foreground">
              {row.original.items.length} campaigns
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'date',
      header: 'Date',
      Header: <HeaderLabel>Date</HeaderLabel>,
      size: 104,
      minSize: 104,
      enableSorting: true,
      Cell: ({ row }) => (isGroupRow(row.original) ? null : formatDate(row.original.date)),
    },
    {
      id: 'account_id',
      accessorKey: 'account_id',
      header: 'Account',
      Header: <HeaderLabel>Account</HeaderLabel>,
      size: 320,
      minSize: 320,
      enableSorting: true,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) return null
        const name = row.original.account_name ?? row.original.account?.account_name
        const id = row.original.account_id ?? row.original.account?.account_id
        return (
          <div className="flex flex-col gap-0.5">
            <span
              className="block whitespace-nowrap text-[10px] font-medium"
              title={name ?? id ?? undefined}
            >
              {name ?? id ?? '-'}
            </span>
            <span
              className="block whitespace-nowrap font-mono text-[10px] text-muted-foreground"
              title={id ?? ''}
            >
              {id ?? '-'}
            </span>
          </div>
        )
      },
    },
    {
      id: 'campaign_id',
      accessorKey: 'campaign_id',
      header: 'Campaign',
      Header: <HeaderLabel>Campaign</HeaderLabel>,
      size: 300,
      minSize: 300,
      enableSorting: true,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) return null
        const name = row.original.campaign_name ?? row.original.campaign?.campaign_name
        const id = row.original.campaign_id ?? row.original.campaign?.campaign_id
        return (
          <div className="flex flex-col gap-0.5">
            <span
              className="block whitespace-nowrap text-[10px] font-medium"
              title={name ?? id ?? undefined}
            >
              {name ?? id ?? '-'}
            </span>
            <span
              className="block whitespace-nowrap font-mono text-[10px] text-muted-foreground"
              title={id ?? ''}
            >
              {id ?? '-'}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: 'campaign_status',
      header: 'Status',
      Header: <HeaderLabel>Status</HeaderLabel>,
      size: 110,
      minSize: 110,
      enableSorting: false,
      Cell: ({ row }) =>
        isGroupRow(row.original) ? null : <StatusPill value={row.original.campaign_status} />,
    },
    {
      id: 'adx_game_id',
      header: 'Game',
      Header: <HeaderLabel>Game</HeaderLabel>,
      size: 220,
      minSize: 220,
      enableSorting: false,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) return null
        const label =
          row.original.game?.name ??
          (row.original.adx_game_id ? `#${row.original.adx_game_id}` : '-')
        return (
          <span className="block whitespace-nowrap text-[10px]" title={label}>
            {label}
          </span>
        )
      },
    },
    {
      id: 'adx_link_id',
      header: 'Link',
      Header: <HeaderLabel>Link</HeaderLabel>,
      size: 260,
      minSize: 260,
      enableSorting: false,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) return null
        const label =
          row.original.link?.name ??
          (row.original.adx_link_id ? `#${row.original.adx_link_id}` : '-')
        return (
          <span className="block whitespace-nowrap text-[10px]" title={label}>
            {label}
          </span>
        )
      },
    },
    money('spend', 'Spend', 104),
    revenue('revenue', 'Rev.', 86),
    revenue('profit', 'Profit', 104),
    revenue('roi', 'ROI', 86),
    revenue('roas', 'ROAS', 92),
    count('adx_clicks', 'ADX Clicks', 108),
    count('ads_clicks', 'Ads Conv.', 108),
    costRatio('cpc', 'RPC', 82),
    revenue('epc', 'EPC', 82),
    revenue('rpm', 'RPM', 86),
    count('landing_view', 'Land. View', 118),
    count('get_game_link_click', 'Game C.Link', 146),
    count('detail_view', 'Detail View', 114),
    count('get_bonus_click', 'Bonus Click', 120),
    count('ads_impressions', 'Ads Impr.', 112),
    count('adx_requests', 'ADX Reqs', 104),
    count('adx_matched_requests', 'ADX Matched Reqs', 150),
    count('adx_impressions', 'ADX Impr.', 112),
    count('adx_viewable_impressions', 'ADX Viewable Impr.', 162),
    money('daily_budget', 'Daily Budget', 132),
    money('lifetime_budget', 'Lifetime Budget', 150),
  ]
}

export function AdxCampaignReportsPage() {
  const [items, setItems] = useState<AdxCampaignReport[]>([])
  const [filterOptions, setFilterOptions] =
    useState<AdxCampaignReportFiltersResponse['data']>(EMPTY_FILTER_OPTIONS)
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<AdxCampaignReportFilterParams>(DEFAULT_FILTERS)
  const isMobile = useIsMobile()
  const { pathname } = useLocation()
  const { columnVisibility: userColumnVisibility, setColumnVisibility: setUserColumnVisibility } =
    useColumnVisibilityStorage(pathname)

  useEffect(() => {
    let ignore = false
    async function run() {
      try {
        const { data } = await adxApi.campaignReportFilters()
        if (!ignore) setFilterOptions(data.data)
      } catch (err) {
        if (!ignore) toast.error(formatApiError(err))
      }
    }
    void run()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false
    async function run() {
      try {
        setLoading(true)
        const { data } = await adxApi.listCampaignReports(filters)
        if (!ignore) {
          setItems(data.data)
          setRowCount(data.pagination.total)
        }
      } catch (err) {
        if (!ignore) toast.error(formatApiError(err))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    void run()
    return () => {
      ignore = true
    }
  }, [filters])

  const onApplyFilters = useCallback((values: Record<string, unknown>) => {
    const range = parseDateRange(values.date_range)
    setFilters((prev) => ({
      ...prev,
      date_from: range?.from ?? null,
      date_to: range?.to ?? null,
      keyword: parseStringOrNull(values.keyword),
      source: parseStringOrNull(values.source),
      account_id: null,
      account_ids: parseStringArray(values.account_ids),
      campaign_id: null,
      campaign_ids: parseStringArray(values.campaign_ids),
      adx_link_data_id: null,
      adx_link_id: null,
      adx_link_ids: parseNumberArray(values.adx_link_ids),
      adx_game_id: null,
      adx_game_ids: parseNumberArray(values.adx_game_ids),
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
    (orderBy: AdxCampaignReportOrderBy | null, order: SortDirection | null) => {
      setFilters((prev) => ({
        ...prev,
        order_by: orderBy,
        order,
        page: 1,
      }))
    },
    [],
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

  const campaignOptions = useMemo<SelectOption[]>(
    () =>
      filterOptions.campaigns.map((campaign) => ({
        value: campaign.campaign_id,
        label: campaign.campaign_name
          ? `${campaign.campaign_name} (${campaign.campaign_id})`
          : campaign.campaign_id,
      })),
    [filterOptions.campaigns],
  )

  const gameOptions = useMemo<SelectOption[]>(
    () =>
      filterOptions.games.map((game) => ({
        value: String(game.id),
        label: game.name ? `${game.name} (#${game.id})` : `Game #${game.id}`,
      })),
    [filterOptions.games],
  )

  const linkOptions = useMemo<SelectOption[]>(
    () =>
      filterOptions.links.map((link) => ({
        value: String(link.id),
        label: link.name ? `${link.name} (#${link.id})` : `Link #${link.id}`,
      })),
    [filterOptions.links],
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
        placeholder: 'Campaign, account, link, game...',
      },
      {
        field: 'source',
        label: 'Source',
        type: 'select',
        value: filters.source ?? null,
        options: SOURCE_OPTIONS,
        placeholder: 'All sources',
      },
      {
        field: 'account_ids',
        label: 'Account',
        type: 'multiselect',
        value: filters.account_ids ?? [],
        options: accountOptions,
        placeholder: 'All accounts',
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
        field: 'adx_game_ids',
        label: 'Game',
        type: 'multiselect',
        value: (filters.adx_game_ids ?? []).map(String),
        options: gameOptions,
        placeholder: 'All games',
      },
      {
        field: 'adx_link_ids',
        label: 'Link',
        type: 'multiselect',
        value: (filters.adx_link_ids ?? []).map(String),
        options: linkOptions,
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
    [accountOptions, campaignOptions, filters, gameOptions, linkOptions],
  )

  const grouped = Boolean(filters.group_by)
  const tableData = useMemo(
    () => groupRows(items, filters.group_by ?? ''),
    [items, filters.group_by],
  )
  const pageSummary = useMemo(() => buildSummary(items), [items])
  const columns = useMemo(() => getColumns(pageSummary), [pageSummary])

  const forcedColumnVisibility = useMemo<Record<string, boolean>>(() => {
    const base: Record<string, boolean> = grouped ? { date: false } : { group_label: false }

    if (filters.group_by === 'source') base.source = false
    if (filters.group_by === 'account_id') base.account_id = false
    if (filters.group_by === 'campaign_id') base.campaign_id = false
    if (filters.group_by === 'adx_game_id') base.adx_game_id = false
    if (filters.group_by === 'adx_link_id') base.adx_link_id = false
    if (filters.group_by === 'adx_link_data_id') base.adx_link_data_id = false

    return base
  }, [filters.group_by, grouped])

  const columnVisibility = useMemo(
    () => ({ ...userColumnVisibility, ...forcedColumnVisibility }),
    [forcedColumnVisibility, userColumnVisibility],
  )

  const sorting = useMemo(
    () => (filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : []),
    [filters.order, filters.order_by],
  )

  const pinnedLeftColumns = useMemo(
    () => (isMobile ? [] : grouped ? ['group_label'] : ['date', 'campaign_id']),
    [grouped, isMobile],
  )

  const table = useMantineReactTable({
    data: tableData,
    columns,
    getRowId: (row, index, parentRow) =>
      isGroupRow(row)
        ? row.id
        : parentRow
          ? `${parentRow.id}:${row.id}:${index}`
          : `${row.id}:${index}`,
    getSubRows: (row) => (isGroupRow(row) ? row.items : []),
    manualPagination: true,
    manualSorting: true,
    rowCount,
    enableTableFooter: true,
    enableStickyFooter: true,
    enableExpanding: grouped,
    enableExpandAll: false,
    displayColumnDefOptions: {
      'mrt-row-expand': {
        mantineTableHeadCellProps: { display: 'none' },
        mantineTableBodyCellProps: { display: 'none' },
        mantineTableFooterCellProps: { display: 'none' },
      },
    },
    enableColumnActions: false,
    enableHiding: true,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableColumnPinning: !isMobile,
    enableRowSelection: false,
    positionToolbarAlertBanner: 'none',
    initialState: { density: 'xs' },
    state: {
      showLoadingOverlay: loading,
      pagination: {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? DEFAULT_PAGE_SIZE,
      },
      sorting,
      expanded: grouped ? true : {},
      columnPinning: { left: pinnedLeftColumns },
      columnVisibility,
    },
    onColumnVisibilityChange: (updater) => {
      setUserColumnVisibility((prev) => {
        const next =
          typeof updater === 'function' ? updater({ ...prev, ...forcedColumnVisibility }) : updater
        const filtered = { ...next }
        for (const key of Object.keys(forcedColumnVisibility)) delete filtered[key]
        return filtered
      })
    },
    onPaginationChange: (updater) => {
      const current = {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? DEFAULT_PAGE_SIZE,
      }
      const next = typeof updater === 'function' ? updater(current) : updater
      onPaginationChange(next.pageIndex + 1, next.pageSize)
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      if (next.length === 0) {
        onSortingChange(null, null)
      } else {
        onSortingChange(next[0].id as AdxCampaignReportOrderBy, next[0].desc ? 'desc' : 'asc')
      }
    },
    mantinePaginationProps: {
      rowsPerPageOptions: ['15', '30', '50', '100', '200'],
    },
    enableRowVirtualization: !isMobile,
    rowVirtualizerProps: { overscan: 5 },
    enablePagination: true,
    paginationDisplayMode: 'pages',
    enableFullScreenToggle: false,
    mantineTableProps: {
      sx: {
        tableLayout: 'auto',
      },
    },
    mantineTableContainerProps: {
      sx: {
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        maxHeight: 'calc(100vh - 182px)',
      },
    },
    mantineTableHeadCellProps: {
      sx: {
        fontSize: '10px',
        paddingLeft: '2px !important',
        paddingRight: '2px !important',
        verticalAlign: 'middle',
        '& .mantine-TableHeadCell-Content-Wrapper': {
          overflow: 'visible',
          whiteSpace: 'nowrap',
          lineHeight: 1.1,
          display: 'flex',
          alignItems: 'center',
        },
      },
    },
    mantineTableBodyRowProps: ({ row }) => ({
      sx: (theme) => {
        const isDark = theme.colorScheme === 'dark'
        if (grouped && (row.getCanExpand() || isGroupRow(row.original))) {
          return {
            fontWeight: 600,
            backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[1],
          }
        }
        if (row.depth > 0) {
          return { backgroundColor: isDark ? theme.colors.dark[8] : theme.white }
        }
        return { backgroundColor: isDark ? theme.colors.dark[7] : theme.white }
      },
    }),
    mantineTableBodyCellProps: ({ row }) => {
      const isGroup = grouped && (row.getCanExpand() || isGroupRow(row.original))
      return {
        sx: {
          fontSize: '10px',
          paddingLeft: '2px !important',
          paddingRight: '2px !important',
          fontWeight: isGroup ? 600 : undefined,
          overflow: 'visible',
          whiteSpace: 'nowrap',
          '& > div': {
            overflow: 'visible',
          },
        },
      }
    },
    mantineTableFooterCellProps: {
      sx: (theme) => {
        const isDark = theme.colorScheme === 'dark'
        return {
          fontSize: '10px',
          paddingLeft: '2px !important',
          paddingRight: '2px !important',
          backgroundColor: isDark ? theme.colors.dark[5] : theme.colors.blue[0],
          color: isDark ? theme.colors.blue[2] : theme.colors.blue[8],
          overflow: 'visible',
          '& > div': {
            overflow: 'visible',
            whiteSpace: 'nowrap',
          },
        }
      },
    },
    localization: { rowsPerPage: 'Per Page' },
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-3 py-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">ADX Campaign Reports</h3>
          <p className="text-xs text-muted-foreground">
            Spend, revenue, ADX delivery, and conversion columns per campaign.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
          {grouped && (
            <span className="inline-flex h-7 items-center rounded-md border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground">
              Grouped by{' '}
              {GROUP_BY_OPTIONS.find((option) => option.value === filters.group_by)?.label}
            </span>
          )}
          <MRT_ShowHideColumnsButton table={t} />
        </div>
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <BarChart3 className="h-8 w-8 text-foreground/30" />
        <p className="text-sm text-foreground">No ADX campaign report data found.</p>
      </div>
    ),
  })

  return (
    <div className="flex flex-col gap-6">
      <FilterPanel
        fields={filterFields}
        onReset={onResetFilters}
        applyMode
        onApply={onApplyFilters}
      />

      <MantineReactTable table={table} />
    </div>
  )
}

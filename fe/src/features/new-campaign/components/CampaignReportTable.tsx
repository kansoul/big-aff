import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  MantineReactTable,
  type MRT_ColumnDef,
  type MRT_PaginationState,
  type MRT_SortingState,
  useMantineReactTable,
} from 'mantine-react-table'
import { BarChart3, RefreshCw, Search } from 'lucide-react'

import { DateRangePickerPresets } from '@/components/ui/date-range-picker-presets'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { newCampaignApi } from '@/features/new-campaign/api'
import {
  NEW_CAMPAIGN_TABLE_DEFAULT_PAGE_SIZE,
  NEW_CAMPAIGN_TABLE_PAGE_SIZE_OPTIONS,
} from '@/features/new-campaign/constants'
import type {
  CampaignReportFilters,
  CampaignReportRow,
  CampaignRow,
  ClickIdChartPoint,
} from '@/features/new-campaign/types'
import dayjs from '@/lib/dayjs'

const DEFAULT_DATE = dayjs().format('YYYY-MM-DD')
type ChartMetric = 'visits' | 'clicks' | 'conversions' | 'impressions' | 'revenue'

const CHART_METRICS: { key: ChartMetric; label: string; color: string; monetary?: boolean }[] = [
  { key: 'visits', label: 'Visits', color: '#58cbed' },
  { key: 'clicks', label: 'Clicks', color: '#cb66f0' },
  { key: 'conversions', label: 'Conversions', color: '#7c75d8' },
  { key: 'impressions', label: 'Impressions', color: '#667085' },
  { key: 'revenue', label: 'Revenue', color: '#f16a6f', monetary: true },
]

function parseFilters(params: URLSearchParams, urlScope: string): CampaignReportFilters {
  return {
    page: Number(params.get(`nc_${urlScope}_click_page`) ?? 1),
    per_page: Number(
      params.get(`nc_${urlScope}_click_per_page`) ?? NEW_CAMPAIGN_TABLE_DEFAULT_PAGE_SIZE,
    ),
    search: params.get(`nc_${urlScope}_click_search`) ?? '',
    date_from: params.get(`nc_${urlScope}_click_date_from`) ?? DEFAULT_DATE,
    date_to: params.get(`nc_${urlScope}_click_date_to`) ?? DEFAULT_DATE,
    order_by:
      (params.get(`nc_${urlScope}_click_order_by`) as keyof CampaignReportRow | null) ?? undefined,
    order: (params.get(`nc_${urlScope}_click_order`) as 'asc' | 'desc' | null) ?? undefined,
  }
}

function buildParams(
  current: URLSearchParams,
  filters: CampaignReportFilters,
  showChart: boolean,
  urlScope: string,
) {
  const next = new URLSearchParams(current)
  const entries: [string, string | undefined][] = [
    [`nc_${urlScope}_click_page`, filters.page === 1 ? undefined : String(filters.page)],
    [
      `nc_${urlScope}_click_per_page`,
      filters.per_page === NEW_CAMPAIGN_TABLE_DEFAULT_PAGE_SIZE
        ? undefined
        : String(filters.per_page),
    ],
    [`nc_${urlScope}_click_search`, filters.search || undefined],
    [`nc_${urlScope}_click_date_from`, filters.date_from ?? undefined],
    [`nc_${urlScope}_click_date_to`, filters.date_to ?? undefined],
    [`nc_${urlScope}_click_order_by`, filters.order_by],
    [`nc_${urlScope}_click_order`, filters.order],
    [`nc_${urlScope}_click_chart`, showChart ? '1' : undefined],
  ]
  entries.forEach(([key, value]) => {
    if (value) next.set(key, value)
    else next.delete(key)
  })
  return next.toString() === current.toString() ? current : next
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function getColumns(): MRT_ColumnDef<CampaignReportRow>[] {
  return [
    { accessorKey: 'name', header: 'Name', size: 150 },
    {
      accessorKey: 'conversions',
      header: 'Conversions',
      size: 125,
      Cell: ({ row }) => (
        <span className="block text-right tabular-nums">{row.original.conversions}</span>
      ),
      mantineTableHeadCellProps: { align: 'right' },
    },
    {
      accessorKey: 'revenue',
      header: 'Revenue',
      size: 135,
      Cell: ({ row }) => (
        <span className="block text-right tabular-nums">
          {formatCurrency(row.original.revenue)}
        </span>
      ),
      mantineTableHeadCellProps: { align: 'right' },
    },
    {
      accessorKey: 'postback_timestamp',
      header: 'Postback timestamp',
      size: 190,
      Cell: ({ row }) => row.original.postback_timestamp ?? '—',
    },
    {
      accessorKey: 'visit_timestamp',
      header: 'Visit timestamp',
      size: 170,
      Cell: ({ row }) => row.original.visit_timestamp ?? '—',
    },
    {
      accessorKey: 'campaign_id',
      header: 'Campaign ID',
      size: 250,
      Cell: ({ row }) => (
        <span className="block truncate font-mono text-xs">{row.original.campaign_id}</span>
      ),
    },
    {
      accessorKey: 'campaign_name',
      header: 'Campaign name',
      size: 330,
      Cell: ({ row }) => <span className="block truncate">{row.original.campaign_name}</span>,
    },
  ]
}

const ClickIdChart = memo(function ClickIdChart({ data }: { data: ClickIdChartPoint[] }) {
  const [visibleMetrics, setVisibleMetrics] = useState<Set<ChartMetric>>(
    () => new Set(CHART_METRICS.map((metric) => metric.key)),
  )
  const metrics = CHART_METRICS.filter((metric) => visibleMetrics.has(metric.key))
  const trafficMetrics = metrics.filter((metric) => !metric.monetary)
  const revenueMetric = metrics.find((metric) => metric.monetary)

  const toggleMetric = useCallback((metric: ChartMetric, checked: boolean) => {
    setVisibleMetrics((current) => {
      const next = new Set(current)
      if (checked) next.add(metric)
      else next.delete(metric)
      return next
    })
  }, [])

  return (
    <section className="mb-4 grid gap-4 border border-border bg-card p-4 xl:grid-cols-[minmax(0,1fr)_190px]">
      <div className="space-y-5">
        <ChartPanel data={data} metrics={trafficMetrics} />
        <ChartPanel data={data} metrics={revenueMetric ? [revenueMetric] : []} money />
      </div>
      <aside className="border-t pt-4 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
        <h3 className="mb-3 text-sm font-semibold">Metrics</h3>
        <div className="space-y-2.5">
          {CHART_METRICS.map((metric) => {
            const checked = visibleMetrics.has(metric.key)
            return (
              <label key={metric.key} className="flex cursor-pointer items-center gap-2 text-xs">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => toggleMetric(metric.key, value === true)}
                  style={{
                    borderColor: metric.color,
                    backgroundColor: checked ? metric.color : undefined,
                  }}
                />
                <span>{metric.label}</span>
              </label>
            )
          })}
        </div>
      </aside>
    </section>
  )
})

const ChartPanel = memo(function ChartPanel({
  data,
  metrics,
  money = false,
}: {
  data: ClickIdChartPoint[]
  metrics: { key: ChartMetric; label: string; color: string; monetary?: boolean }[]
  money?: boolean
}) {
  return (
    <div className="h-52 min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            interval={2}
          />
          <YAxis
            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => (money ? `$${value}` : String(value))}
            width={42}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--popover-foreground)',
              fontSize: 12,
            }}
            formatter={(value, name) => [money ? formatCurrency(Number(value)) : value, name]}
          />
          {metrics.map((metric) => (
            <Line
              key={metric.key}
              type="monotone"
              dataKey={metric.key}
              name={metric.label}
              stroke={metric.color}
              strokeWidth={2.5}
              dot={{ r: 3, fill: metric.color }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
})

type CampaignReportTableProps = {
  campaign?: CampaignRow
  urlScope: string
}

function CampaignReportTableInner({ campaign, urlScope }: CampaignReportTableProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<CampaignReportFilters>(() =>
    parseFilters(searchParams, urlScope),
  )
  const [showChart, setShowChart] = useState(
    () => searchParams.get(`nc_${urlScope}_click_chart`) === '1',
  )
  const [rows, setRows] = useState<CampaignReportRow[]>([])
  const [chartData, setChartData] = useState<ClickIdChartPoint[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [requestKey, setRequestKey] = useState(0)
  const [sorting, setSorting] = useState<MRT_SortingState>(() =>
    filters.order_by && filters.order
      ? [{ id: filters.order_by, desc: filters.order === 'desc' }]
      : [],
  )
  const [pagination, setPagination] = useState<MRT_PaginationState>(() => ({
    pageIndex: Math.max(0, filters.page - 1),
    pageSize: filters.per_page,
  }))

  const deferredSearch = useDeferredValue(filters.search)
  const requestFilters = useMemo(
    () => ({
      page: filters.page,
      per_page: filters.per_page,
      search: deferredSearch,
      date_from: filters.date_from,
      date_to: filters.date_to,
      order_by: filters.order_by,
      order: filters.order,
    }),
    [
      deferredSearch,
      filters.date_from,
      filters.date_to,
      filters.order,
      filters.order_by,
      filters.page,
      filters.per_page,
    ],
  )

  useEffect(() => {
    setSearchParams((current) => buildParams(current, filters, showChart, urlScope), {
      replace: true,
    })
  }, [filters, setSearchParams, showChart, urlScope])

  useEffect(() => {
    let cancelled = false
    void newCampaignApi
      .listCampaignReport(campaign, requestFilters)
      .then((response) => {
        if (cancelled) return
        setRows(response.data)
        setRowCount(response.pagination.total)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [campaign, requestFilters, requestKey])

  useEffect(() => {
    if (!showChart) return
    let cancelled = false
    void newCampaignApi.listClickIdChart(campaign, filters).then((data) => {
      if (!cancelled) setChartData(data)
    })
    return () => {
      cancelled = true
    }
  }, [campaign, filters, showChart])

  const columns = useMemo(() => getColumns(), [])
  const updateFilters = useCallback((patch: Partial<CampaignReportFilters>) => {
    setLoading(true)
    setFilters((current) => ({ ...current, ...patch }))
  }, [])
  const onSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updateFilters({ search: event.target.value, page: 1 })
      setPagination((current) => ({ ...current, pageIndex: 0 }))
    },
    [updateFilters],
  )
  const onDateChange = useCallback(
    (dateFrom: string | null, dateTo: string | null) => {
      updateFilters({ date_from: dateFrom, date_to: dateTo, page: 1 })
      setPagination((current) => ({ ...current, pageIndex: 0 }))
    },
    [updateFilters],
  )
  const onPaginationChange = useCallback(
    (updater: MRT_PaginationState | ((previous: MRT_PaginationState) => MRT_PaginationState)) => {
      const next = typeof updater === 'function' ? updater(pagination) : updater
      setPagination(next)
      updateFilters({ page: next.pageIndex + 1, per_page: next.pageSize })
    },
    [pagination, updateFilters],
  )
  const onSortingChange = useCallback(
    (updater: MRT_SortingState | ((previous: MRT_SortingState) => MRT_SortingState)) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      const sort = next[0]
      setSorting(next)
      setPagination((current) => ({ ...current, pageIndex: 0 }))
      updateFilters({
        page: 1,
        order_by: sort?.id as keyof CampaignReportRow | undefined,
        order: sort ? (sort.desc ? 'desc' : 'asc') : undefined,
      })
    },
    [sorting, updateFilters],
  )

  const table = useMantineReactTable({
    columns,
    data: rows,
    getRowId: (row) => row.id,
    manualPagination: true,
    manualSorting: true,
    rowCount,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableFullScreenToggle: false,
    enableDensityToggle: false,
    paginationDisplayMode: 'pages',
    mantinePaginationProps: {
      rowsPerPageOptions: NEW_CAMPAIGN_TABLE_PAGE_SIZE_OPTIONS,
    },
    state: { pagination, showLoadingOverlay: loading, sorting },
    onPaginationChange,
    onSortingChange,
    mantineTableContainerProps: { className: 'overflow-x-auto' },
    renderTopToolbar: () => (
      <div className="flex w-full flex-col gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {campaign?.campaign_name ?? 'Click IDs'}
            </p>
            {campaign ? (
              <p className="truncate font-mono text-[11px] text-muted-foreground">
                {campaign.campaign_id}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-72">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.search}
                onChange={onSearchChange}
                className="h-8 pl-8 text-xs"
                placeholder="Search by text..."
                aria-label="Search Click IDs"
              />
            </div>
            <DateRangePickerPresets
              from={filters.date_from}
              to={filters.date_to}
              onChange={onDateChange}
              className="sm:w-60"
              placeholder="Select date range"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                setLoading(true)
                setRequestKey((current) => current + 1)
              }}
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Refresh
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium">
          <BarChart3 className="size-4 text-muted-foreground" aria-hidden />
          <span>Chart</span>
          <Switch
            checked={showChart}
            onCheckedChange={setShowChart}
            aria-label="Show Click ID chart"
          />
        </div>
        {showChart ? <ClickIdChart data={chartData} /> : null}
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const CampaignReportTable = memo(CampaignReportTableInner)

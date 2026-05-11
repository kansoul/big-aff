import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import dayjs from '@/lib/dayjs'

import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import type { DateRangeValue } from '@/components/ui/date-range-picker-presets'
import { adxApi } from '@/features/adx/api'
import {
  EmptyRow,
  MonoText,
  PaginationBar,
  SOURCE_OPTIONS,
  SortButton,
  StatusPill,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type SortState,
} from '@/features/adx/components/AdxShared'
import type {
  AdxCampaignReport,
  AdxCampaignReportFilterParams,
  AdxCampaignReportOrderBy,
  PaginationMeta,
} from '@/features/adx/types'
import { formatApiError } from '@/features/settings/components'
import { Table } from '@/components/ui/table'

const DEFAULT_PAGE_SIZE = 15

const DEFAULT_FILTERS: AdxCampaignReportFilterParams = {
  page: 1,
  per_page: DEFAULT_PAGE_SIZE,
  date_from: dayjs().format('YYYY-MM-DD'),
  date_to: dayjs().format('YYYY-MM-DD'),
  source: null,
  account_id: null,
  campaign_id: null,
  order_by: 'date',
  order: 'desc',
}

function money(value: string | number | null | undefined): string {
  return Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function parseDateRange(value: unknown): DateRangeValue | null {
  if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
    const next = value as DateRangeValue
    return { from: next.from ?? null, to: next.to ?? null }
  }
  return null
}

function parseStringOrNull(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value
  return null
}

export function AdxCampaignReportsPage() {
  const [items, setItems] = useState<AdxCampaignReport[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<AdxCampaignReportFilterParams>(DEFAULT_FILTERS)

  useEffect(() => {
    let ignore = false
    async function run() {
      try {
        setLoading(true)
        const { data } = await adxApi.listCampaignReports(filters)
        if (!ignore) {
          setItems(data.data)
          setPagination(data.pagination)
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

  const sort = useMemo<SortState<AdxCampaignReportOrderBy>>(
    () => ({ order_by: filters.order_by ?? null, order: filters.order ?? null }),
    [filters.order, filters.order_by],
  )
  const onSort = useCallback((column: AdxCampaignReportOrderBy) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      order_by: column,
      order: prev.order_by === column && prev.order === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const onApplyFilters = useCallback((values: Record<string, unknown>) => {
    const range = parseDateRange(values.date_range)
    setFilters((prev) => ({
      ...prev,
      date_from: range?.from ?? null,
      date_to: range?.to ?? null,
      source: parseStringOrNull(values.source),
      account_id: parseStringOrNull(values.account_id),
      campaign_id: parseStringOrNull(values.campaign_id),
      page: 1,
    }))
  }, [])

  const onResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const sourceOptions = useMemo(() => SOURCE_OPTIONS.map((s) => ({ value: s, label: s })), [])

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
        field: 'source',
        label: 'Source',
        type: 'select',
        value: filters.source ?? null,
        options: sourceOptions,
        placeholder: 'All sources',
      },
      {
        field: 'account_id',
        label: 'Account ID',
        type: 'input',
        value: filters.account_id ?? null,
        placeholder: 'Account ID...',
      },
      {
        field: 'campaign_id',
        label: 'Campaign ID',
        type: 'input',
        value: filters.campaign_id ?? null,
        placeholder: 'Campaign ID...',
      },
    ],
    [filters, sourceOptions],
  )

  return (
    <div className="flex flex-col gap-6">
      <FilterPanel
        fields={filterFields}
        onReset={onResetFilters}
        applyMode
        onApply={onApplyFilters}
      />
      <section className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton column="date" sort={sort} onSort={onSort}>
                  Date
                </SortButton>
              </TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>
                <SortButton column="spend" sort={sort} onSort={onSort}>
                  Spend
                </SortButton>
              </TableHead>
              <TableHead>
                <SortButton column="revenue" sort={sort} onSort={onSort}>
                  Revenue
                </SortButton>
              </TableHead>
              <TableHead>
                <SortButton column="profit" sort={sort} onSort={onSort}>
                  Profit
                </SortButton>
              </TableHead>
              <TableHead>
                <SortButton column="roi" sort={sort} onSort={onSort}>
                  ROI
                </SortButton>
              </TableHead>
              <TableHead>ROAS</TableHead>
              <TableHead>Funnel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <EmptyRow colSpan={9}>Loading campaign reports...</EmptyRow>
            ) : items.length === 0 ? (
              <EmptyRow colSpan={9}>No campaign reports found.</EmptyRow>
            ) : (
              items.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{report.date}</TableCell>
                  <TableCell>
                    <div className="max-w-64 truncate font-medium">
                      {report.campaign_name ?? report.campaign_id ?? '-'}
                    </div>
                    <MonoText value={report.campaign_id} className="text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <StatusPill value={report.source} />
                  </TableCell>
                  <TableCell>{money(report.spend)}</TableCell>
                  <TableCell>{money(report.revenue)}</TableCell>
                  <TableCell>{money(report.profit)}</TableCell>
                  <TableCell>{money(report.roi)}</TableCell>
                  <TableCell>{money(report.roas)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {report.realtime_report?.landing_views ?? '-'}/
                    {report.realtime_report?.get_game_link_clicks ?? '-'}/
                    {report.realtime_report?.detail_views ?? '-'}/
                    {report.realtime_report?.get_bonus_clicks ?? '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <PaginationBar
          pagination={pagination}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          onPageSizeChange={(perPage) =>
            setFilters((prev) => ({ ...prev, page: 1, per_page: perPage }))
          }
        />
      </section>
    </div>
  )
}

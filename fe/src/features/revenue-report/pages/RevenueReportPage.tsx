import { useCallback, useEffect, useMemo, useState } from 'react'
import { MantineReactTable, type MRT_ColumnDef, useMantineReactTable } from 'mantine-react-table'
import { toast } from 'sonner'

import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { Badge } from '@/components/ui/badge'
import { campaignReportApi } from '@/features/campaign-report/api'
import type {
  RevenueReportFilterParams,
  RevenueReportRow,
  RevenueReportSummary,
} from '@/features/revenue-report/types'
import { revenueReportApi } from '@/features/revenue-report/api/revenueReportApi'

const DEFAULT_FILTERS: RevenueReportFilterParams = {
  page: 1,
  per_page: 30,
}

export function RevenueReportPage() {
  const [rows, setRows] = useState<RevenueReportRow[]>([])
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [campaignOptions, setCampaignOptions] = useState<Array<{ value: string; label: string }>>(
    [],
  )
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<Partial<RevenueReportSummary>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    campaignReportApi
      .filters()
      .then(({ data }) => {
        setCampaignOptions(
          data.data.campaigns.map((campaign) => ({
            value: campaign.campaign_id,
            label: campaign.campaign_name
              ? `${campaign.campaign_name} (${campaign.campaign_id})`
              : campaign.campaign_id,
          })),
        )
      })
      .catch(() => toast.error('Failed to load campaigns'))
  }, [])

  const loadData = useCallback(async (activeFilters: RevenueReportFilterParams) => {
    try {
      setLoading(true)
      const { data } = await revenueReportApi.listRevenue(activeFilters)
      setRows(data.data)
      setTotal(data.pagination.total)
      setSummary(data.summary)
    } catch {
      toast.error('Failed to load revenue report')
      setRows([])
      setTotal(0)
      setSummary({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData(filters)
  }, [filters, loadData])

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'date_range',
        label: 'Date',
        type: 'daterange',
        value:
          filters.date_from || filters.date_to
            ? { from: filters.date_from ?? null, to: filters.date_to ?? null }
            : null,
      },
      {
        field: 'campaign_ids',
        label: 'Campaigns',
        type: 'multiselect',
        value: filters.campaign_ids ?? [],
        options: campaignOptions,
      },
    ],
    [campaignOptions, filters.campaign_ids, filters.date_from, filters.date_to],
  )

  const columns = useMemo<MRT_ColumnDef<RevenueReportRow>[]>(
    () => [
      { accessorKey: 'session_id', header: 'Session ID', size: 270 },
      { accessorKey: 'campaign_id', header: 'Campaign ID', size: 150 },
      { accessorKey: 'adset_id', header: 'Adset ID', size: 150 },
      { accessorKey: 'ad_id', header: 'Ad ID', size: 150 },
      { accessorKey: 'click_id', header: 'Click ID', size: 100 },
      {
        accessorKey: 'estimate_earning',
        header: 'Estimate Earning',
        size: 140,
        Cell: ({ row }) => (
          <Badge variant="secondary">${Number(row.original.estimate_earning).toFixed(4)}</Badge>
        ),
        Footer: () => <Badge>${Number(summary.estimate_earning ?? 0).toFixed(4)}</Badge>,
      },
      {
        accessorKey: 'page_views',
        header: 'Page Views',
        size: 110,
        Footer: () => Number(summary.page_views ?? 0).toLocaleString(),
      },
      {
        accessorKey: 'clicks',
        header: 'Clicks',
        size: 90,
        Footer: () => Number(summary.clicks ?? 0).toLocaleString(),
      },
      {
        accessorKey: 'ad_requests',
        header: 'Ad Requests',
        size: 110,
        Footer: () => Number(summary.ad_requests ?? 0).toLocaleString(),
      },
      {
        accessorKey: 'impressions',
        header: 'Impressions',
        size: 110,
        Footer: () => Number(summary.impressions ?? 0).toLocaleString(),
      },
      {
        accessorKey: 'ad_requests_rpm',
        header: 'Ad Requests RPM',
        size: 130,
        Footer: () => Number(summary.ad_requests_rpm ?? 0).toFixed(4),
      },
      {
        accessorKey: 'impressions_rpm',
        header: 'Impressions RPM',
        size: 130,
        Footer: () => Number(summary.impressions_rpm ?? 0).toFixed(4),
      },
      {
        accessorKey: 'cost_per_click',
        header: 'Cost / Click',
        size: 110,
        Footer: () => Number(summary.cost_per_click ?? 0).toFixed(4),
      },
      {
        accessorKey: 'funnel_requests',
        header: 'Funnel Requests',
        size: 120,
        Footer: () => Number(summary.funnel_requests ?? 0).toLocaleString(),
      },
      {
        accessorKey: 'funnel_impressions',
        header: 'Funnel Impressions',
        size: 140,
        Footer: () => Number(summary.funnel_impressions ?? 0).toLocaleString(),
      },
      {
        accessorKey: 'funnel_clicks',
        header: 'Funnel Clicks',
        size: 110,
        Footer: () => Number(summary.funnel_clicks ?? 0).toLocaleString(),
      },
      {
        accessorKey: 'funnel_rpm',
        header: 'Funnel RPM',
        size: 110,
        Footer: () => Number(summary.funnel_rpm ?? 0).toFixed(4),
      },
      {
        accessorKey: 'created_at',
        header: 'Created At',
        size: 180,
      },
    ],
    [summary],
  )

  const table = useMantineReactTable({
    columns,
    data: rows,
    rowCount: total,
    manualPagination: true,
    manualSorting: true,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    state: {
      isLoading: loading,
      pagination: {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? 30,
      },
    },
    onPaginationChange: (updater) => {
      const current = {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? 30,
      }
      const next = typeof updater === 'function' ? updater(current) : updater
      setFilters((previous) => ({
        ...previous,
        page: next.pageIndex + 1,
        per_page: next.pageSize,
      }))
    },
  })

  return (
    <div className="flex flex-col gap-4">
      <FilterPanel
        fields={filterFields}
        applyMode
        onApply={(values: Record<string, unknown>) => {
          const range = values.date_range as { from?: string | null; to?: string | null } | null
          setFilters((previous) => ({
            ...previous,
            date_from: range?.from ?? null,
            date_to: range?.to ?? null,
            campaign_ids: Array.isArray(values.campaign_ids)
              ? values.campaign_ids.filter(
                  (value: unknown): value is string => typeof value === 'string',
                )
              : [],
            page: 1,
          }))
        }}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />
      <MantineReactTable table={table} />
    </div>
  )
}

import { memo, useCallback, useMemo, useState } from 'react'
import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  type MRT_ColumnDef,
  useMantineReactTable,
} from 'mantine-react-table'
import { BarChart3 } from 'lucide-react'

import { buildCopyLink } from '@/lib/ads-link'
import { useIsMobile } from '@/hooks/useMobile'

import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import type {
  CampaignReportDataRow,
  CampaignReportFilterParams,
  CampaignReportGroupBy,
  CampaignReportGroupRow,
  CampaignReportOrderBy,
  CampaignReportRow,
  CampaignReportSummary,
} from '@/features/campaign-report/types'
import {
  AdsAdsetDeliveryReportDialog,
  CampaignRulesDialog,
  CampaignSchedulesDialog,
  RevenueChartDialog,
  RevenueReportRangeDialog,
  TrackingAnalyticsDialog,
} from '@/features/campaign-report/components'

// ─── Types ───────────────────────────────────────────────────────────────────

type TableRow = CampaignReportDataRow

type RevenueDialogTarget = {
  channelCode?: string
  dateFrom?: string | null
  dateTo?: string | null
}
type MetricKey = keyof CampaignReportSummary

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatUsd(v: number): string {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDecimal(v: number, digits = 2): string {
  return v.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

function formatRoi(v: number): string {
  return `${v.toFixed(2)}%`
}

function toNumber(v: unknown): number {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

// ─── Row helpers ─────────────────────────────────────────────────────────────

function isGroupRow(row: TableRow): row is CampaignReportGroupRow {
  return typeof row === 'object' && row !== null && 'is_group' in row && row.is_group === true
}

function getRowAdsManagerLink(row: TableRow): string | null {
  if (isGroupRow(row)) return null
  return row.ads_manager_link ?? null
}

function getRowArticleLink(row: TableRow): string | null {
  if (isGroupRow(row)) return null
  const { site_url, slug, ads_type } = row
  if (!site_url || !slug) return null
  const adsTypeLower = (ads_type ?? '').toLowerCase()
  if (adsTypeLower === 'facebook') return buildCopyLink(site_url, slug, 'facebook')
  if (adsTypeLower === 'google') return buildCopyLink(site_url, slug, 'google')
  return null
}

function metric(row: TableRow, key: MetricKey): number {
  if (isGroupRow(row)) return toNumber(row.group_summary[key])
  return toNumber((row as unknown as Record<string, unknown>)[key as string])
}

// ─── Column factory helpers ───────────────────────────────────────────────────
//
// Each factory produces a MRT column definition for a numeric metric.
// They share the same Cell/Footer pattern but differ in formatting and style.

function makeUsdCol(
  key: MetricKey,
  header: string,
  size: number,
  summary: CampaignReportSummary | null,
): MRT_ColumnDef<TableRow> {
  return {
    accessorKey: key as string,
    header,
    size,
    Cell: ({ row }) => (
      <span className="tabular-nums text-xs text-muted-foreground">
        {formatUsd(metric(row.original, key))}
      </span>
    ),
    Footer: () =>
      summary ? (
        <span className="tabular-nums text-xs font-semibold">
          {formatUsd(toNumber(summary[key]))}
        </span>
      ) : null,
  }
}

function makeRatioCol(
  key: MetricKey,
  header: string,
  size: number,
  summary: CampaignReportSummary | null,
  digits = 4,
): MRT_ColumnDef<TableRow> {
  return {
    accessorKey: key as string,
    header,
    size,
    Cell: ({ row }) => (
      <span className="tabular-nums text-xs text-muted-foreground">
        {formatDecimal(metric(row.original, key), digits)}
      </span>
    ),
    Footer: () =>
      summary ? (
        <span className="tabular-nums text-xs font-semibold">
          {formatDecimal(toNumber(summary[key]), digits)}
        </span>
      ) : null,
  }
}

function makeCountCol(
  key: MetricKey,
  header: string,
  size: number,
  summary: CampaignReportSummary | null,
): MRT_ColumnDef<TableRow> {
  return {
    accessorKey: key as string,
    header,
    size,
    Cell: ({ row }) => <span className="tabular-nums text-xs">{metric(row.original, key)}</span>,
    Footer: () =>
      summary ? <span className="tabular-nums text-xs font-semibold">{summary[key]}</span> : null,
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GroupLabelCell({
  row,
  isChannelGroup,
  dateFrom,
  dateTo,
  onOpenRevenueRange,
  onOpenRevenueChart,
}: {
  row: CampaignReportGroupRow
  isChannelGroup: boolean
  dateFrom?: string | null
  dateTo?: string | null
  onOpenRevenueRange: (target: RevenueDialogTarget) => void
  onOpenRevenueChart: (target: RevenueDialogTarget) => void
}) {
  const channelCode = typeof row.group_key === 'string' ? row.group_key : undefined
  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold text-foreground">
        {row.group_label ?? String(row.group_key ?? '—')}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-muted-foreground">{row.record_count} record(s)</span>
        {isChannelGroup && (
          <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-foreground transition-colors hover:bg-muted"
              onClick={() => onOpenRevenueRange({ channelCode, dateFrom, dateTo })}
            >
              View Revenue Range
            </button>
            <button
              className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-foreground transition-colors hover:bg-muted"
              onClick={() => onOpenRevenueChart({ channelCode, dateFrom, dateTo })}
            >
              View Chart
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function GroupSubRowCell({ row }: { row: Exclude<TableRow, CampaignReportGroupRow> }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-muted-foreground">{row.date_start ?? '—'}</span>
      <span className="text-xs font-medium text-foreground">
        {row.campaign_name ?? row.campaign_id}
      </span>
      <span className="text-[10px] font-mono text-muted-foreground">{row.campaign_id}</span>
    </div>
  )
}

const GROUP_BY_LABEL: Record<string, string> = {
  channel_code: 'Channel',
  account_id: 'Account',
  user_id: 'User',
  campaign_id: 'Campaign',
}

// ─── Column definitions ───────────────────────────────────────────────────────

function getColumns(
  summary: CampaignReportSummary | null,
  grouped: boolean,
  groupBy: CampaignReportGroupBy,
  toggling: Record<string, boolean>,
  onToggleCampaignStatus: (campaignId: string, checked: boolean) => void,
  onOpenTrackingAnalytics: (row: CampaignReportRow) => void,
  onOpenAdsAdsetReport: (row: CampaignReportRow) => void,
  canViewDeliveryReports: boolean,
  dateFrom?: string | null,
  dateTo?: string | null,
  onOpenRevenueRange?: (target: RevenueDialogTarget) => void,
  onOpenRevenueChart?: (target: RevenueDialogTarget) => void,
): MRT_ColumnDef<TableRow>[] {
  // Shortcuts to avoid passing summary repeatedly
  const usd = (key: MetricKey, header: string, size: number) =>
    makeUsdCol(key, header, size, summary)
  const ratio = (key: MetricKey, header: string, size: number, digits = 4) =>
    makeRatioCol(key, header, size, summary, digits)
  const count = (key: MetricKey, header: string, size: number) =>
    makeCountCol(key, header, size, summary)

  // ── Group label (only in grouped mode) ──
  const groupLabelCol: MRT_ColumnDef<TableRow> | null = grouped
    ? {
        id: 'group_label',
        header: GROUP_BY_LABEL[groupBy] ?? 'Group',
        size: 320,
        enableSorting: false,
        Cell: ({ row }) =>
          isGroupRow(row.original) ? (
            <GroupLabelCell
              row={row.original}
              isChannelGroup={groupBy === 'channel_code'}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onOpenRevenueRange={
                onOpenRevenueRange ??
                (() => {
                  /* empty */
                })
              }
              onOpenRevenueChart={
                onOpenRevenueChart ??
                (() => {
                  /* empty */
                })
              }
            />
          ) : (
            <GroupSubRowCell row={row.original} />
          ),
      }
    : null

  // ── Identity / dimension columns ──
  const colDateStart: MRT_ColumnDef<TableRow> = {
    accessorKey: 'date_start',
    header: 'Date',
    size: 110,
    enableSorting: !grouped,
    Cell: ({ row }) =>
      isGroupRow(row.original) ? null : (
        <span className="text-xs text-muted-foreground">{row.original.date_start ?? '—'}</span>
      ),
  }

  const colAccountName: MRT_ColumnDef<TableRow> = {
    accessorKey: 'account_name',
    header: 'Account',
    size: 180,
    enableSorting: !grouped,
    Cell: ({ row }) =>
      isGroupRow(row.original) ? null : (
        <span className="text-xs text-muted-foreground">
          {row.original.account_name ?? row.original.account_id ?? '—'}
        </span>
      ),
  }

  const colCampaignName: MRT_ColumnDef<TableRow> = {
    accessorKey: 'campaign_name',
    header: 'Campaign',
    size: 220,
    enableSorting: !grouped,
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      return (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-foreground">
            {row.original.campaign_name ?? row.original.campaign_id}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            {row.original.campaign_id}
          </span>
        </div>
      )
    },
  }

  const colCampaignStatus: MRT_ColumnDef<TableRow> = {
    accessorKey: 'campaign_status',
    header: 'Status',
    size: 110,
    enableSorting: !grouped,
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      const status = row.original.campaign_status
      return <StatusBadge status={status} label={status ?? undefined} />
    },
  }

  const colCampaignOnOff: MRT_ColumnDef<TableRow> = {
    id: 'campaign_onoff',
    header: 'On/Off',
    size: 80,
    enableSorting: false,
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      const r = row.original
      const isActive = (r.campaign_status ?? '').toUpperCase() === 'ACTIVE'
      return (
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={isActive}
            disabled={Boolean(toggling[r.campaign_id])}
            aria-label={`Toggle status for ${r.campaign_id}`}
            onCheckedChange={(checked) => {
              void onToggleCampaignStatus(r.campaign_id, checked)
            }}
          />
        </div>
      )
    },
  }

  const colLink: MRT_ColumnDef<TableRow> = {
    id: 'link',
    header: 'Link',
    size: 200,
    enableSorting: false,
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      const link = getRowArticleLink(row.original)
      if (!link) return <span className="text-muted-foreground/50">—</span>
      const display = link.length > 70 ? link.slice(0, 70) + '…' : link
      return (
        <a
          className="font-mono text-[11px] text-primary underline-offset-4 hover:underline"
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          title={link}
          onClick={(e) => e.stopPropagation()}
        >
          {display}
        </a>
      )
    },
  }

  const colTrackingAnalytic: MRT_ColumnDef<TableRow> = {
    id: 'tracking_analytic',
    header: 'Tracking Analytic',
    size: 150,
    enableSorting: false,
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      const r = row.original
      return (
        <button
          className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-foreground transition-colors hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation()
            onOpenTrackingAnalytics(r)
          }}
        >
          View Analytics
        </button>
      )
    },
  }

  const colAdsAdsetReport: MRT_ColumnDef<TableRow> = {
    id: 'ads_adset_report',
    header: 'Ads / Adset',
    size: 150,
    enableSorting: false,
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      if (!canViewDeliveryReports) return <span className="text-muted-foreground/50">—</span>
      const r = row.original
      return (
        <button
          className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-foreground transition-colors hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation()
            onOpenAdsAdsetReport(r)
          }}
        >
          Ads / Adset Report
        </button>
      )
    },
  }

  const colAdsType: MRT_ColumnDef<TableRow> = {
    accessorKey: 'ads_type',
    header: 'Ads Type',
    size: 110,
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return <span className="text-muted-foreground/50">—</span>
      const val = row.original.ads_type
      return <StatusBadge status={val} label={val ?? undefined} />
    },
  }

  const colChannelName: MRT_ColumnDef<TableRow> = {
    accessorKey: 'channel_name',
    header: 'Channel',
    size: 200,
    enableSorting: !grouped,
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      const r = row.original
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {r.channel_name ?? r.channel_code ?? '—'}
          </span>
          <span className="text-xs font-mono text-muted-foreground/70">
            {r.channel_code ?? '—'}
          </span>
        </div>
      )
    },
  }

  // ── Profit / ROI columns ──
  const colProfit: MRT_ColumnDef<TableRow> = {
    accessorKey: 'profit',
    header: 'Profit',
    size: 120,
    Cell: ({ row }) => {
      const v = isGroupRow(row.original) ? row.original.group_summary.profit : row.original.profit
      return (
        <span
          className={cn(
            'tabular-nums text-xs font-medium',
            v >= 0 ? 'text-emerald-500' : 'text-rose-500',
          )}
        >
          {formatUsd(v)}
        </span>
      )
    },
  }

  const colRoi: MRT_ColumnDef<TableRow> = {
    accessorKey: 'roi',
    header: 'ROI',
    size: 90,
    Cell: ({ row }) => {
      const v = isGroupRow(row.original) ? row.original.group_summary.roi : row.original.roi
      return (
        <span
          className={cn(
            'tabular-nums text-xs font-medium',
            v >= 0 ? 'text-emerald-500' : 'text-rose-500',
          )}
        >
          {formatRoi(v)}
        </span>
      )
    },
  }

  // ── Realtime (rt_*) columns ──
  const colRtClickAdCount: MRT_ColumnDef<TableRow> = {
    id: 'rt_click_ad_count',
    header: '🟢 Realtime Clicks',
    size: 130,
    accessorFn: (row) => (isGroupRow(row) ? 0 : (row.realtime_report?.click_ad_count ?? 0)),
    enableSorting: false,
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      const rt = row.original.realtime_report
      return rt ? (
        <span className="tabular-nums text-xs">{rt.click_ad_count}</span>
      ) : (
        <span className="text-muted-foreground/50">—</span>
      )
    },
    Footer: () =>
      summary ? (
        <span className="tabular-nums text-xs font-semibold">{summary.rt_click_ad_count}</span>
      ) : null,
  }

  const colRtClickKeywordCount: MRT_ColumnDef<TableRow> = {
    id: 'rt_click_keyword_count',
    header: '🟢 Realtime Keyword Clicks',
    size: 170,
    accessorFn: (row) => (isGroupRow(row) ? 0 : (row.realtime_report?.click_keyword_count ?? 0)),
    enableSorting: false,
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      const rt = row.original.realtime_report
      return rt ? (
        <span className="tabular-nums text-xs">{rt.click_keyword_count}</span>
      ) : (
        <span className="text-muted-foreground/50">—</span>
      )
    },
    Footer: () =>
      summary ? (
        <span className="tabular-nums text-xs font-semibold">{summary.rt_click_keyword_count}</span>
      ) : null,
  }

  const colRtViewSearchCount: MRT_ColumnDef<TableRow> = {
    id: 'rt_view_search_count',
    header: '🟢 Realtime Search Views',
    size: 160,
    accessorFn: (row) => (isGroupRow(row) ? 0 : (row.realtime_report?.view_search_count ?? 0)),
    enableSorting: false,
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      const rt = row.original.realtime_report
      return rt ? (
        <span className="tabular-nums text-xs">{rt.view_search_count}</span>
      ) : (
        <span className="text-muted-foreground/50">—</span>
      )
    },
    Footer: () =>
      summary ? (
        <span className="tabular-nums text-xs font-semibold">{summary.rt_view_search_count}</span>
      ) : null,
  }

  const colRtViewArticleCount: MRT_ColumnDef<TableRow> = {
    id: 'rt_view_article_count',
    header: '🟢 Realtime Article Views',
    size: 160,
    accessorFn: (row) => (isGroupRow(row) ? 0 : (row.realtime_report?.view_article_count ?? 0)),
    enableSorting: false,
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      const rt = row.original.realtime_report
      return rt ? (
        <span className="tabular-nums text-xs">{rt.view_article_count}</span>
      ) : (
        <span className="text-muted-foreground/50">—</span>
      )
    },
    Footer: () =>
      summary ? (
        <span className="tabular-nums text-xs font-semibold">{summary.rt_view_article_count}</span>
      ) : null,
  }

  // Column order matches AllReportResource.php
  return [
    // ── Group label (grouped mode only) ──
    ...(groupLabelCol ? [groupLabelCol] : []),

    // ── Identity / dimension ──
    colDateStart,
    colAccountName,
    colCampaignName,
    colCampaignStatus,
    colCampaignOnOff,
    colTrackingAnalytic,
    colAdsAdsetReport,
    colLink,
    colAdsType,
    colChannelName,

    // ── Revenue & spend ──
    usd('r_revenue', '🟡 Revenue', 120),
    usd('a_spend', '🔵 Spending', 120),
    colProfit,
    colRoi,

    // ── Conversions ──
    colRtClickAdCount, // 🟢 Real-time Conv.
    count('r_conversion', 'Rev. Conv.', 110), // 🟡 Conv.
    count('a_conversion', '🔵 ADS Conv.', 110), // 🔵 ADS Conv.

    // ── Search impressions & RPM ──
    count('r_impressions', '🟡 Impressions', 160),
    ratio('r_impressions_rpm', '🟡 Impr. RPM', 120),
    ratio('r_rpc', '🟡 RPC', 100),

    // ── CPA ──
    ratio('r_cpa', '🟡 Revenue CPA', 130),
    ratio('a_cpa', '🔵 ADS CPA', 110),

    // ── Search views ──
    colRtViewSearchCount, // 🟢 Realtime Search Views
    count('r_search_views', '🟡 SearchViews', 160), // 🟡 SearchViews
    count('a_search_views', '🔵 ADS SearchView', 140), // 🔵 ADS SearchView

    // ── Keyword / funnel ──
    colRtClickKeywordCount, // 🟢 Realtime Keyword Clicks
    count('a_clicks', '🔵 Supply clicks', 110), // 🔵 Supply clicks
    count('r_funnel_clicks', '🟡 Funnel Clicks', 140), // 🟡 Funnel Clicks
    count('r_funnel_requests', '🟡 Funnel Requests', 150), // 🟡 Funnel Requests
    count('r_funnel_impressions', '🟡 Funnel Impr.', 140), // 🟡 Funnel Impressions
    ratio('r_funnel_rpm', '🟡 Funnel RPM', 120), // 🟡 Funnel RPM

    // ── Ad requests ──
    count('r_ad_requests', '🟡 Ad Requests', 130),
    ratio('r_ad_requests_rpm', '🟡 Req. RPM', 110),

    // ── ADS platform metrics ──
    ratio('a_ctr_link', '🔵 ADS CTR', 110),
    count('a_article_views', '🔵 Landingpage view', 150),
    ratio('a_cpc_link', '🔵 ADS CPC Link', 110),
    count('a_reach', '🔵 ADS Reach', 110),
    count('a_impressions', '🔵 ADS Impressions', 120),
    ratio('a_cpm', '🔵 CPM', 100),
    ratio('a_frequency', '🔵 Frequency', 110),
    ratio('a_ctr', '🔵 FB CTR (All)', 100),

    // ── Budget ──
    usd('daily_budget', '🔵 Daily Budget', 130),
    usd('lifetime_budget', '🔵 Lifetime Budget', 140),

    // ── Remaining ADS cols ──
    count('a_ad_clicks', '🔵 Ad Clicks', 110),
    ratio('a_cpc', '🔵 ADS CPC', 100),

    // ── Remaining realtime ──
    colRtViewArticleCount,
  ]
}

// ─── Props & component ────────────────────────────────────────────────────────

type Props = {
  data: TableRow[]
  rowCount: number
  loading: boolean
  filters: CampaignReportFilterParams
  summary: CampaignReportSummary | null
  toggling: Record<string, boolean>
  userPermissions: string[]
  onPaginationChange: (page: number, perPage: number) => void
  onSortingChange: (orderBy: CampaignReportOrderBy | null, order: 'asc' | 'desc' | null) => void
  onToggleCampaignStatus: (campaignId: string, checked: boolean) => void
}

function CampaignReportTableCardInner({
  data,
  rowCount,
  loading,
  filters,
  summary,
  toggling,
  userPermissions,
  onPaginationChange,
  onSortingChange,
  onToggleCampaignStatus,
}: Props) {
  const grouped = Boolean(filters.group_by)
  const isMobile = useIsMobile()
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false)
  const [trackingDialogTarget, setTrackingDialogTarget] = useState<CampaignReportRow | null>(null)
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false)
  const [deliveryDialogTarget, setDeliveryDialogTarget] = useState<CampaignReportRow | null>(null)
  const [revenueRangeOpen, setRevenueRangeOpen] = useState(false)
  const [revenueRangeTarget, setRevenueRangeTarget] = useState<RevenueDialogTarget | null>(null)
  const [revenueChartOpen, setRevenueChartOpen] = useState(false)
  const [revenueChartTarget, setRevenueChartTarget] = useState<RevenueDialogTarget | null>(null)

  const openTrackingAnalytics = useCallback((row: CampaignReportRow) => {
    setTrackingDialogTarget(row)
    setTrackingDialogOpen(true)
  }, [])

  const openDeliveryReport = useCallback((row: CampaignReportRow) => {
    setDeliveryDialogTarget(row)
    setDeliveryDialogOpen(true)
  }, [])

  const onTrackingDialogOpenChange = useCallback((next: boolean) => {
    setTrackingDialogOpen(next)
    if (!next) setTrackingDialogTarget(null)
  }, [])

  const onDeliveryDialogOpenChange = useCallback((next: boolean) => {
    setDeliveryDialogOpen(next)
    if (!next) setDeliveryDialogTarget(null)
  }, [])

  const openRevenueRange = useCallback((target: RevenueDialogTarget) => {
    setRevenueRangeTarget(target)
    setRevenueRangeOpen(true)
  }, [])

  const openRevenueChart = useCallback((target: RevenueDialogTarget) => {
    setRevenueChartTarget(target)
    setRevenueChartOpen(true)
  }, [])

  const onRevenueRangeOpenChange = useCallback((next: boolean) => {
    setRevenueRangeOpen(next)
    if (!next) setRevenueRangeTarget(null)
  }, [])

  const onRevenueChartOpenChange = useCallback((next: boolean) => {
    setRevenueChartOpen(next)
    if (!next) setRevenueChartTarget(null)
  }, [])

  const canViewDeliveryReports = useMemo(
    () => hasPermission(userPermissions, PermissionSlugs.DeliveryEntitiesReportsView),
    [userPermissions],
  )
  const columns = useMemo(
    () =>
      getColumns(
        summary,
        grouped,
        filters.group_by ?? '',
        toggling,
        onToggleCampaignStatus,
        openTrackingAnalytics,
        openDeliveryReport,
        canViewDeliveryReports,
        filters.date_from,
        filters.date_to,
        openRevenueRange,
        openRevenueChart,
      ),
    [
      filters.group_by,
      filters.date_from,
      filters.date_to,
      grouped,
      onToggleCampaignStatus,
      openTrackingAnalytics,
      openDeliveryReport,
      canViewDeliveryReports,
      summary,
      toggling,
      openRevenueRange,
      openRevenueChart,
    ],
  )

  const sorting = useMemo(
    () => (filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : []),
    [filters.order_by, filters.order],
  )

  const pinnedLeftColumns = useMemo(
    () => (isMobile ? [] : grouped ? ['group_label'] : ['date_start', 'campaign_name']),
    [grouped, isMobile],
  )

  const table = useMantineReactTable({
    data,
    columns,
    getRowId: (row, index, parentRow) =>
      isGroupRow(row)
        ? `group:${String(row.group_key ?? 'null')}`
        : parentRow
          ? `${parentRow.id}:${String(row.id)}:${index}`
          : `${String(row.id)}:${index}`,
    getSubRows: (row) => (isGroupRow(row) ? row.items : []),
    manualPagination: true,
    manualSorting: true,
    rowCount,
    enableTableFooter: true,
    enableExpanding: grouped,
    enableExpandAll: false,
    displayColumnDefOptions: {
      'mrt-row-expand': {
        mantineTableHeadCellProps: { display: 'none' },
        mantineTableBodyCellProps: { display: 'none' },
      },
    },
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableColumnPinning: !isMobile,
    enableRowSelection: false,
    positionToolbarAlertBanner: 'none',
    mantinePaginationProps: {
      rowsPerPageOptions: [
        '30',
        '50',
        '100',
        '300',
        '500',
        { value: '1000000', label: 'All' },
      ] as unknown as string[],
    },
    initialState: { density: 'xs' },
    state: {
      showLoadingOverlay: loading,
      pagination: {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? 30,
      },
      sorting,
      expanded: grouped ? true : {},
      columnPinning: {
        left: pinnedLeftColumns,
      },
      columnVisibility: grouped
        ? { date_start: false, campaign_name: false }
        : { group_label: false },
    },
    onPaginationChange: (updater) => {
      const current = {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? 30,
      }
      const next = typeof updater === 'function' ? updater(current) : updater
      onPaginationChange(next.pageIndex + 1, next.pageSize)
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      if (next.length === 0) {
        onSortingChange(null, null)
      } else {
        onSortingChange(next[0].id as CampaignReportOrderBy, next[0].desc ? 'desc' : 'asc')
      }
    },
    enableRowVirtualization: true,
    rowVirtualizerProps: { overscan: 5 },
    enablePagination: true,
    paginationDisplayMode: 'pages',
    enableFullScreenToggle: false,
    mantineTableContainerProps: {
      className: 'campaign-report-table-container',
      sx: {
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        maxHeight: 'calc(100vh - 220px)',
      },
    },
    mantineTableBodyRowProps: ({ row }) => {
      const isGroup = grouped && (row.getCanExpand() || isGroupRow(row.original))
      const isSubRow = row.depth > 0
      const link = getRowAdsManagerLink(row.original)
      return {
        className: isGroup ? 'campaign-group-row' : undefined,
        onClick: (e) => {
          if (
            (e.target as HTMLElement).closest(
              'a, button, input, textarea, select, [role="switch"], [role="menuitem"]',
            )
          ) {
            return
          }
          if (link) window.open(link, '_blank', 'noopener,noreferrer')
        },
        sx: (theme) => {
          const isDark = theme.colorScheme === 'dark'
          if (isGroup) {
            return {
              fontWeight: 600,
              boxShadow: `inset 3px 0 0 0 ${isDark ? theme.colors.dark[2] : theme.colors.gray[5]}`,
            }
          }
          if (isSubRow) {
            return {
              backgroundColor: isDark ? theme.colors.dark[8] : theme.colors.gray[0],
              '&:hover td': {
                backgroundColor: isDark
                  ? `${theme.colors.dark[6]} !important`
                  : `${theme.colors.gray[1]} !important`,
              },
              cursor: link ? 'pointer' : undefined,
            }
          }
          return {
            backgroundColor: isDark ? theme.colors.dark[7] : theme.white,
            '&:hover td': {
              backgroundColor: isDark
                ? `${theme.colors.dark[5]} !important`
                : `${theme.colors.gray[0]} !important`,
            },
            cursor: link ? 'pointer' : undefined,
          }
        },
      }
    },
    mantineTableBodyCellProps: ({ row }) =>
      grouped && (row.getCanExpand() || isGroupRow(row.original))
        ? {
            className: 'campaign-group-cell',
            sx: () => {
              return {
                fontWeight: 600,
              }
            },
          }
        : {},
    localization: { rowsPerPage: 'Per Page' },
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-3 py-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Daily Campaign Reports
        </h3>
        <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
          <CampaignSchedulesDialog
            trigger={
              <button className="inline-flex items-center gap-1.5 rounded border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted">
                Campaign Schedules
              </button>
            }
          />
          <CampaignRulesDialog
            trigger={
              <button className="inline-flex items-center gap-1.5 rounded border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted">
                Campaign Rules
              </button>
            }
          />
          <MRT_ShowHideColumnsButton table={t} />
        </div>
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No campaign report data found.</p>
      </div>
    ),
  })

  return (
    <>
      <MantineReactTable table={table} />

      {trackingDialogTarget && (
        <TrackingAnalyticsDialog
          open={trackingDialogOpen}
          onOpenChange={onTrackingDialogOpenChange}
          initialDate={trackingDialogTarget.date_start ?? undefined}
          initialCampaignId={trackingDialogTarget.campaign_id ?? undefined}
          initialAccountId={
            trackingDialogTarget.account_id != null
              ? String(trackingDialogTarget.account_id)
              : undefined
          }
        />
      )}

      {deliveryDialogTarget && (
        <AdsAdsetDeliveryReportDialog
          open={deliveryDialogOpen}
          onOpenChange={onDeliveryDialogOpenChange}
          campaignId={deliveryDialogTarget.campaign_id}
          campaignName={deliveryDialogTarget.campaign_name}
          initialDateFrom={deliveryDialogTarget.date_start ?? filters.date_from ?? null}
          initialDateTo={deliveryDialogTarget.date_start ?? filters.date_to ?? null}
        />
      )}

      {revenueRangeTarget && (
        <RevenueReportRangeDialog
          open={revenueRangeOpen}
          onOpenChange={onRevenueRangeOpenChange}
          initialChannelCodes={
            revenueRangeTarget.channelCode ? [revenueRangeTarget.channelCode] : undefined
          }
          initialDateFrom={revenueRangeTarget.dateFrom}
          initialDateTo={revenueRangeTarget.dateTo}
        />
      )}

      {revenueChartTarget && (
        <RevenueChartDialog
          open={revenueChartOpen}
          onOpenChange={onRevenueChartOpenChange}
          initialChannelCodes={
            revenueChartTarget.channelCode ? [revenueChartTarget.channelCode] : undefined
          }
          initialDateFrom={revenueChartTarget.dateFrom}
          initialDateTo={revenueChartTarget.dateTo}
        />
      )}
    </>
  )
}

export const CampaignReportTableCard = memo(CampaignReportTableCardInner)

import { memo, useCallback, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'

import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  type MRT_ColumnDef,
  useMantineReactTable,
} from 'mantine-react-table'
import { BarChart3, CalendarClock, BookOpen, SlidersHorizontal } from 'lucide-react'

import { buildCopyLink } from '@/lib/ads-link'
import { useIsMobile } from '@/hooks/useMobile'
import { useColumnVisibilityStorage } from '@/hooks/useColumnVisibilityStorage'

import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import type {
  CampaignReportDataRow,
  CampaignReportFilterParams,
  CampaignReportFiltersResponse,
  CampaignReportGroupBy,
  CampaignReportGroupRow,
  CampaignReportOrderBy,
  CampaignReportRow,
  CampaignReportSummary,
} from '@/features/campaign-report/types'
import {
  AdsAdsetDeliveryReportDialog,
  CampaignIdSelector,
  CampaignRulesDialog,
  CampaignSchedulesDialog,
  RevenueChartReportInternalDialog,
  RevenueChartDialog,
  RevenueReportRangeDialog,
  TargetCpaFormDialog,
  TrackingAnalyticsDialog,
} from '@/features/campaign-report/components'
import { Button } from '@/components/ui'
import type { RBACRole } from '@/shared/types'

// ─── Types ───────────────────────────────────────────────────────────────────

type TableRow = CampaignReportDataRow

type RevenueDialogTarget = {
  channelCode?: string
  dateFrom?: string | null
  dateTo?: string | null
}

type InsightChartDialogTarget = {
  channelCode: string
  channelName?: string
  dateFrom?: string | null
  dateTo?: string | null
}
type MetricKey = keyof CampaignReportSummary

function HeaderLabel({
  icon,
  children,
}: {
  icon?: 'yellow' | 'blue' | 'green'
  children: React.ReactNode
}) {
  const emoji = icon === 'yellow' ? '🟡' : icon === 'blue' ? '🔵' : icon === 'green' ? '🟢' : null
  return (
    <div className="flex min-h-[20px] items-center gap-1">
      {emoji && <span className="text-[5px] leading-none">{emoji}</span>}
      <span className="leading-tight font-bold">{children}</span>
    </div>
  )
}

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

function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  const [y, m, d] = date.split('-')
  if (!y || !m || !d) return date
  return `${d}/${m}/${y}`
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

// ─── Constants ───────────────────────────────────────────────────────────────

const SORTABLE_COLUMNS = new Set([
  'id',
  'date_start',
  'account_id',
  'account_name',
  'campaign_id',
  'campaign_name',
  'ads_type',
  'channel_code',
  'channel_name',
  'daily_budget',
  'lifetime_budget',
  'r_search_views',
  'r_conversion',
  'r_revenue',
  'r_rpc',
  'r_ad_requests',
  'r_ad_requests_rpm',
  'r_impressions',
  'r_impressions_rpm',
  'r_funnel_requests',
  'r_funnel_clicks',
  'r_funnel_impressions',
  'r_funnel_rpm',
  'r_cpa',
  'a_ad_clicks',
  'a_article_views',
  'a_search_views',
  'a_conversion',
  'a_spend',
  'a_impressions',
  'a_cpc',
  'a_cpm',
  'a_ctr',
  'a_reach',
  'a_cpa',
  'a_ctr_link',
  'a_cpc_link',
  'a_frequency',
  'a_clicks',
])

// ─── Column factory helpers ───────────────────────────────────────────────────
//
// Each factory produces a MRT column definition for a numeric metric.
// They share the same Cell/Footer pattern but differ in formatting and style.

// Returns min size expanded to fit the footer text (6px/char at 10px tabular-nums + 8px padding).
function autoSize(minSize: number, footerText: string | null | undefined): number {
  if (!footerText) return minSize
  return Math.max(minSize, footerText.length * 6 + 8)
}

function makeUsdCol(
  key: MetricKey,
  header: string,
  size: number,
  summary: CampaignReportSummary | null,
  icon?: 'yellow' | 'blue' | 'green',
): MRT_ColumnDef<TableRow> {
  const isRevenueField = (key as string).startsWith('r_')
  const footerText = summary ? formatUsd(toNumber(summary[key])) : null
  return {
    accessorKey: key as string,
    header,
    Header: <HeaderLabel icon={icon}>{header}</HeaderLabel>,
    size: autoSize(size, footerText),
    enableSorting: SORTABLE_COLUMNS.has(key as string),
    Cell: ({ row }) => {
      if (isRevenueField && !isGroupRow(row.original))
        return <span className="text-foreground/30 text-[10px]">—</span>
      const v = formatUsd(metric(row.original, key))
      return (
        <span className="tabular-nums text-[10px] text-foreground truncate" title={v}>
          {v}
        </span>
      )
    },
    Footer: () => {
      if (!summary) return null
      return (
        <span className="tabular-nums text-[10px] font-semibold whitespace-nowrap">
          {footerText}
        </span>
      )
    },
  }
}

function makeRatioCol(
  key: MetricKey,
  header: string,
  size: number,
  summary: CampaignReportSummary | null,
  digits = 2,
  icon?: 'yellow' | 'blue' | 'green',
): MRT_ColumnDef<TableRow> {
  const isRevenueField = (key as string).startsWith('r_')
  const footerText = summary ? formatDecimal(toNumber(summary[key]), digits) : null
  return {
    accessorKey: key as string,
    header,
    Header: <HeaderLabel icon={icon}>{header}</HeaderLabel>,
    size: autoSize(size, footerText),
    enableSorting: SORTABLE_COLUMNS.has(key as string),
    Cell: ({ row }) => {
      if (isRevenueField && !isGroupRow(row.original))
        return <span className="text-foreground/30 text-[10px]">—</span>
      const v = formatDecimal(metric(row.original, key), digits)
      return (
        <span className="tabular-nums text-[10px] text-foreground truncate" title={v}>
          {v}
        </span>
      )
    },
    Footer: () => {
      if (!summary) return null
      return (
        <span className="tabular-nums text-[10px] font-semibold whitespace-nowrap">
          {footerText}
        </span>
      )
    },
  }
}

function makeCountCol(
  key: MetricKey,
  header: string,
  size: number,
  summary: CampaignReportSummary | null,
  icon?: 'yellow' | 'blue' | 'green',
): MRT_ColumnDef<TableRow> {
  const isRevenueField = (key as string).startsWith('r_')
  const footerText = summary ? String(summary[key]) : null
  return {
    accessorKey: key as string,
    header,
    Header: <HeaderLabel icon={icon}>{header}</HeaderLabel>,
    size: autoSize(size, footerText),
    enableSorting: SORTABLE_COLUMNS.has(key as string),
    Cell: ({ row }) => {
      if (isRevenueField && !isGroupRow(row.original))
        return <span className="text-foreground/30 text-[10px]">—</span>
      const v = String(metric(row.original, key))
      return (
        <span className="tabular-nums text-[10px] truncate" title={v}>
          {v}
        </span>
      )
    },
    Footer: () => {
      if (!summary) return null
      return (
        <span className="tabular-nums text-[10px] font-semibold whitespace-nowrap">
          {footerText}
        </span>
      )
    },
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
  onOpenInsightChart,
}: {
  row: CampaignReportGroupRow
  isChannelGroup: boolean
  dateFrom?: string | null
  dateTo?: string | null
  onOpenRevenueRange: (target: RevenueDialogTarget) => void
  onOpenRevenueChart: (target: RevenueDialogTarget) => void
  onOpenInsightChart?: (target: InsightChartDialogTarget) => void
}) {
  const channelCode = typeof row.group_key === 'string' ? row.group_key : undefined
  const channelName = isChannelGroup ? (row.items[0]?.channel_name ?? null) : null
  const groupLabel =
    isChannelGroup && channelName
      ? `${channelName} (${row.group_key ?? '—'})`
      : (row.group_label ?? String(row.group_key ?? '—'))
  return (
    <div className="flex items-center pl-1">
      <div className="flex flex-col">
        <span
          className="block max-w-[160px] truncate text-[10px] font-semibold text-foreground"
          title={groupLabel}
        >
          {groupLabel} ({row.record_count})
        </span>
        {isChannelGroup && (
          <div className="flex items-center gap-1.5 mt-0.5" onClick={(e) => e.stopPropagation()}>
            <button
              className="rounded px-1 py-0.5 text-[9px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 transition-colors whitespace-nowrap"
              onClick={() => onOpenRevenueRange({ channelCode, dateFrom, dateTo })}
            >
              Rev Range
            </button>
            <button
              className="rounded px-1 py-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 transition-colors whitespace-nowrap"
              onClick={() => onOpenRevenueChart({ channelCode, dateFrom, dateTo })}
            >
              Chart
            </button>
            {onOpenInsightChart && channelCode && (
              <button
                className="rounded px-1 py-0.5 text-[9px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 transition-colors whitespace-nowrap"
                onClick={() =>
                  onOpenInsightChart({
                    channelCode,
                    channelName: channelName ?? undefined,
                    dateFrom,
                    dateTo,
                  })
                }
              >
                Detail
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CopyIdCell({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      className="block truncate text-[9px] font-mono text-foreground hover:text-foreground transition-colors cursor-pointer text-left w-full"
      title={copied ? 'Copied!' : `Click to copy: ${id}`}
      onClick={(e) => {
        e.stopPropagation()
        void navigator.clipboard.writeText(id).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
    >
      {copied ? <span className="text-emerald-500">Copied!</span> : id}
    </button>
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
  onOpenTargetCpa: (row: CampaignReportRow) => void,
  canViewDeliveryReports: boolean,
  dateFrom?: string | null,
  dateTo?: string | null,
  onOpenRevenueRange?: (target: RevenueDialogTarget) => void,
  onOpenRevenueChart?: (target: RevenueDialogTarget) => void,
  onOpenInsightChart?: (target: InsightChartDialogTarget) => void,
): MRT_ColumnDef<TableRow>[] {
  // Shortcuts to avoid passing summary repeatedly
  const usd = (key: MetricKey, header: string, size: number, icon?: 'yellow' | 'blue' | 'green') =>
    makeUsdCol(key, header, size, summary, icon)

  const ratio = (
    key: MetricKey,
    header: string,
    size: number,
    digits = 4,
    icon?: 'yellow' | 'blue' | 'green',
  ) => makeRatioCol(key, header, size, summary, digits, icon)

  const count = (
    key: MetricKey,
    header: string,
    size: number,
    icon?: 'yellow' | 'blue' | 'green',
  ) => makeCountCol(key, header, size, summary, icon)

  const isSortable = (key: string) => SORTABLE_COLUMNS.has(key)

  // ── Group label (only in grouped mode) ──
  const groupLabelCol: MRT_ColumnDef<TableRow> | null = grouped
    ? {
        id: 'group_label',
        header: GROUP_BY_LABEL[groupBy] ?? 'Group',
        Header: (
          <div className="pl-1">
            <HeaderLabel>{GROUP_BY_LABEL[groupBy] ?? 'Group'}</HeaderLabel>
          </div>
        ),
        size: 190,
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
              onOpenInsightChart={onOpenInsightChart}
            />
          ) : (
            <span className="pl-1 text-[10px] text-foreground">
              {formatDate(row.original.date_start)}
            </span>
          ),
        Footer: () => <div className="text-sm!">Summary</div>,
      }
    : null

  // ── Identity / dimension columns ──
  const colDateStart: MRT_ColumnDef<TableRow> = {
    accessorKey: 'date_start',
    header: 'Date',
    Header: <HeaderLabel>Date</HeaderLabel>,
    size: 100,
    enableSorting: isSortable('date_start'),
    Cell: ({ row }) =>
      isGroupRow(row.original) ? null : (
        <span className="text-[10px] text-foreground">{formatDate(row.original.date_start)}</span>
      ),
  }

  const colAccountName: MRT_ColumnDef<TableRow> = {
    accessorKey: 'account_name',
    header: 'Account',
    Header: <HeaderLabel>Account</HeaderLabel>,
    size: 160,
    enableSorting: isSortable('account_name'),
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      const label = row.original.account_name ?? row.original.account_id ?? '—'
      return (
        <span className="block truncate text-[10px] text-foreground" title={String(label)}>
          {label}
        </span>
      )
    },
  }

  const colCampaignName: MRT_ColumnDef<TableRow> = {
    accessorKey: 'campaign_name',
    header: 'Campaign',
    Header: <HeaderLabel>Campaign</HeaderLabel>,
    size: 200,
    enableSorting: isSortable('campaign_name'),
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      const link = getRowAdsManagerLink(row.original)
      const name = row.original.campaign_name ?? '—'
      const hasRule = row.original.has_rule
      if (link) {
        return (
          <span className="whitespace-normal wrap-break-word text-[10px] font-medium leading-tight">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline underline-offset-2"
              onClick={(e) => e.stopPropagation()}
              title={name}
            >
              {name}
            </a>
            {hasRule && (
              <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300 leading-none ml-1 align-middle">
                Rule
              </span>
            )}
          </span>
        )
      }
      return (
        <span className="whitespace-normal wrap-break-word text-[10px] font-medium text-foreground leading-tight">
          {name}
          {hasRule && (
            <span className="inline-flex items-center rounded px-1 py-0.5 text-[9px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300 leading-none ml-1 align-middle">
              Rule
            </span>
          )}
        </span>
      )
    },
  }

  const colCampaignId: MRT_ColumnDef<TableRow> = {
    accessorKey: 'campaign_id',
    header: 'Campaign ID',
    Header: <HeaderLabel>Campaign ID</HeaderLabel>,
    size: 140,
    enableSorting: isSortable('campaign_id'),
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      return <CopyIdCell id={String(row.original.campaign_id)} />
    },
  }

  const colCampaignStatus: MRT_ColumnDef<TableRow> = {
    accessorKey: 'campaign_status',
    header: 'Status',
    Header: <HeaderLabel>Status</HeaderLabel>,
    size: 85,
    enableSorting: isSortable('campaign_status'),
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      const status = row.original.campaign_status
      return (
        <StatusBadge
          status={status}
          label={status ?? undefined}
          className="h-3.5 px-1 py-0 text-[10px] font-medium"
        />
      )
    },
  }

  const colCampaignOnOff: MRT_ColumnDef<TableRow> = {
    id: 'campaign_onoff',
    header: 'On/Off',
    Header: <HeaderLabel>On/Off</HeaderLabel>,
    size: 55,
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
    Header: <HeaderLabel>Link</HeaderLabel>,
    size: 120,
    enableSorting: false,
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      const link = getRowArticleLink(row.original)
      if (!link) return <span className="text-foreground/50">—</span>
      return (
        <a
          className="block max-w-[110px] truncate font-mono text-[10px] text-primary underline-offset-4 hover:underline"
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          title={link}
          onClick={(e) => e.stopPropagation()}
        >
          {link}
        </a>
      )
    },
  }

  const colTrackingAnalytic: MRT_ColumnDef<TableRow> = {
    id: 'tracking_analytic',
    header: 'Tracking',
    Header: <HeaderLabel>Tracking</HeaderLabel>,
    size: 80,
    enableSorting: false,
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      const r = row.original
      return (
        <p
          className="cursor-pointer text-red-400"
          onClick={(e) => {
            e.stopPropagation()
            onOpenTrackingAnalytics(r)
          }}
        >
          View Analytics
        </p>
      )
    },
  }

  const colAdsAdsetReport: MRT_ColumnDef<TableRow> = {
    id: 'ads_adset_report',
    header: 'Ads/Adset',
    Header: <HeaderLabel>Ads/Adset</HeaderLabel>,
    size: 70,
    enableSorting: false,
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      if (!canViewDeliveryReports) return <span className="text-foreground/50">—</span>
      const r = row.original
      return (
        <p
          className="cursor-pointer text-red-400"
          onClick={(e) => {
            e.stopPropagation()
            onOpenAdsAdsetReport(r)
          }}
        >
          Ads / Adset
        </p>
      )
    },
  }

  const colAdsType: MRT_ColumnDef<TableRow> = {
    accessorKey: 'ads_type',
    header: 'Ads Type',
    Header: <HeaderLabel>Ads Type</HeaderLabel>,
    size: 85,
    enableSorting: isSortable('ads_type'),
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return <span className="text-foreground/50">—</span>
      const val = row.original.ads_type
      return (
        <StatusBadge
          status={val}
          className="h-3.5 px-1 py-0 text-[10px] font-medium"
          label={val ?? undefined}
        />
      )
    },
  }

  const colUserEmail: MRT_ColumnDef<TableRow> = {
    accessorKey: 'user_email',
    header: 'User',
    Header: <HeaderLabel>User</HeaderLabel>,
    size: 160,
    enableSorting: false,
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      const email = row.original.user_email
      if (!email) return <span className="text-foreground/50 text-[10px]">—</span>
      return (
        <span className="block max-w-[150px] truncate text-[10px] text-foreground" title={email}>
          {email}
        </span>
      )
    },
  }

  const colChannelName: MRT_ColumnDef<TableRow> = {
    accessorKey: 'channel_name',
    header: 'Channel',
    Header: <HeaderLabel>Channel</HeaderLabel>,
    size: 90,
    enableSorting: isSortable('channel_name'),
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      const r = row.original
      return (
        <div className="flex flex-col">
          <span
            className="max-w-[70px] truncate text-[10px] text-foreground"
            title={String(r.channel_name ?? r.channel_code ?? '—')}
          >
            {r.channel_name ?? r.channel_code ?? '—'}
          </span>
        </div>
      )
    },
  }

  // ── Revenue Est column (realtime-based) ──
  const colRevenueEst: MRT_ColumnDef<TableRow> = (() => {
    const footerText = summary ? formatUsd(toNumber(summary.revenue_est)) : null
    return {
      accessorKey: 'revenue_est',
      header: 'R. Rev',
      Header: <HeaderLabel icon="green">R. Rev</HeaderLabel>,
      size: autoSize(75, footerText),
      enableSorting: isSortable('revenue_est'),
      Cell: ({ row }) => {
        const v = formatUsd(metric(row.original, 'revenue_est'))
        return (
          <span className="tabular-nums text-[10px] text-foreground truncate" title={v}>
            {v}
          </span>
        )
      },
      Footer: () =>
        footerText ? (
          <span className="tabular-nums text-[10px] font-semibold whitespace-nowrap">
            {footerText}
          </span>
        ) : null,
    }
  })()

  // ── ROI Realtime column ──
  const colRoiRealtime: MRT_ColumnDef<TableRow> = (() => {
    const footerText = summary ? formatRoi(toNumber(summary.roi_realtime)) : null
    return {
      accessorKey: 'roi_realtime',
      header: 'R. ROI',
      Header: <HeaderLabel icon="green">R. ROI</HeaderLabel>,
      size: autoSize(65, footerText),
      enableSorting: isSortable('roi_realtime'),
      Cell: ({ row }) => {
        const v = isGroupRow(row.original)
          ? row.original.group_summary.roi_realtime
          : row.original.roi_realtime
        const vFormatted = formatRoi(v)
        return (
          <span
            className={cn(
              'tabular-nums text-[10px] truncate font-medium',
              v >= 0 ? 'text-emerald-500' : 'text-rose-500',
            )}
            title={vFormatted}
          >
            {vFormatted}
          </span>
        )
      },
      Footer: () =>
        footerText ? (
          <span
            className={cn(
              'tabular-nums text-[10px] font-semibold whitespace-nowrap',
              summary!.roi_realtime >= 0 ? 'text-emerald-500' : 'text-rose-500',
            )}
          >
            {footerText}
          </span>
        ) : null,
    }
  })()

  // ── Real-time computed columns (calculated by BE, display-only) ──
  const colRtCpa: MRT_ColumnDef<TableRow> = (() => {
    const footerText = summary ? formatUsd(summary.rt_cpa) : null
    return {
      accessorKey: 'rt_cpa',
      header: 'R. CPA',
      Header: <HeaderLabel icon="green">R. CPA</HeaderLabel>,
      size: autoSize(70, footerText),
      enableSorting: false,
      Cell: ({ row }) => {
        const v = isGroupRow(row.original) ? row.original.group_summary.rt_cpa : row.original.rt_cpa
        if (v === null || v === 0) return <span className="text-foreground/50 text-[10px]">—</span>
        const vFormatted = formatUsd(v)
        return (
          <span className="tabular-nums text-[10px] text-foreground truncate" title={vFormatted}>
            {vFormatted}
          </span>
        )
      },
      Footer: () =>
        footerText ? (
          <span className="tabular-nums text-[10px] font-semibold whitespace-nowrap">
            {footerText}
          </span>
        ) : null,
    }
  })()

  const colRtCvr: MRT_ColumnDef<TableRow> = (() => {
    const footerText = summary ? `${formatDecimal(summary.rt_cvr)}%` : null
    return {
      accessorKey: 'rt_cvr',
      header: 'R. CVR',
      Header: <HeaderLabel icon="green">R. CVR</HeaderLabel>,
      size: autoSize(70, footerText),
      enableSorting: false,
      Cell: ({ row }) => {
        const v = isGroupRow(row.original) ? row.original.group_summary.rt_cvr : row.original.rt_cvr
        if (v === null || v === 0) return <span className="text-foreground/50 text-[10px]">—</span>
        const vFormatted = `${formatDecimal(v)}%`
        return (
          <span className="tabular-nums text-[10px] text-foreground truncate" title={vFormatted}>
            {vFormatted}
          </span>
        )
      },
      Footer: () =>
        footerText ? (
          <span className="tabular-nums text-[10px] font-semibold whitespace-nowrap">
            {footerText}
          </span>
        ) : null,
    }
  })()

  // ── CTR Keyword (yellow) — r_funnel_impressions / r_funnel_requests * 100 ──
  const colCtrKeyword: MRT_ColumnDef<TableRow> = (() => {
    const footerText = summary ? `${formatDecimal(summary.ctr_keyword)}%` : null
    return {
      accessorKey: 'ctr_keyword',
      header: 'CTR Kw',
      Header: <HeaderLabel icon="yellow">CTR Kw</HeaderLabel>,
      size: autoSize(90, footerText),
      enableSorting: false,
      Cell: ({ row }) => {
        const v = isGroupRow(row.original)
          ? row.original.group_summary.ctr_keyword
          : row.original.ctr_keyword
        if (v === null || v === 0) return <span className="text-foreground/50 text-[10px]">—</span>
        const vFormatted = `${formatDecimal(v)}%`
        return (
          <span className="tabular-nums text-[10px] text-foreground truncate" title={vFormatted}>
            {vFormatted}
          </span>
        )
      },
      Footer: () =>
        footerText ? (
          <span className="tabular-nums text-[10px] font-semibold whitespace-nowrap">
            {footerText}
          </span>
        ) : null,
    }
  })()

  const colRtCtrKeyword: MRT_ColumnDef<TableRow> = (() => {
    const footerText = summary ? `${formatDecimal(summary.rt_ctr_keyword)}%` : null
    return {
      accessorKey: 'rt_ctr_keyword',
      header: 'R. CTR Kw',
      Header: <HeaderLabel icon="green">R. CTR Kw</HeaderLabel>,
      size: autoSize(100, footerText),
      enableSorting: false,
      Cell: ({ row }) => {
        const v = isGroupRow(row.original)
          ? row.original.group_summary.rt_ctr_keyword
          : row.original.rt_ctr_keyword
        if (v === null || v === 0) return <span className="text-foreground/50 text-[10px]">—</span>
        const vFormatted = `${formatDecimal(v)}%`
        return (
          <span className="tabular-nums text-[10px] text-foreground truncate" title={vFormatted}>
            {vFormatted}
          </span>
        )
      },
      Footer: () =>
        footerText ? (
          <span className="tabular-nums text-[10px] font-semibold whitespace-nowrap">
            {footerText}
          </span>
        ) : null,
    }
  })()

  const colRtCtrSearch: MRT_ColumnDef<TableRow> = (() => {
    const footerText = summary ? `${formatDecimal(summary.rt_ctr_search)}%` : null
    return {
      accessorKey: 'rt_ctr_search',
      header: 'R. CTR S.',
      Header: <HeaderLabel icon="green">R. CTR S.</HeaderLabel>,
      size: autoSize(95, footerText),
      enableSorting: false,
      Cell: ({ row }) => {
        const v = isGroupRow(row.original)
          ? row.original.group_summary.rt_ctr_search
          : row.original.rt_ctr_search
        if (v === null || v === 0) return <span className="text-foreground/50 text-[10px]">—</span>
        const vFormatted = `${formatDecimal(v)}%`
        return (
          <span className="tabular-nums text-[10px] text-foreground truncate" title={vFormatted}>
            {vFormatted}
          </span>
        )
      },
      Footer: () =>
        footerText ? (
          <span className="tabular-nums text-[10px] font-semibold whitespace-nowrap">
            {footerText}
          </span>
        ) : null,
    }
  })()

  // ── Profit / ROI columns ──
  const colProfit: MRT_ColumnDef<TableRow> = (() => {
    const footerText = summary ? formatUsd(toNumber(summary.profit)) : null
    return {
      accessorKey: 'profit',
      header: 'Profit',
      Header: <HeaderLabel>Profit</HeaderLabel>,
      size: autoSize(70, footerText),
      Cell: ({ row }) => {
        const v = isGroupRow(row.original) ? row.original.group_summary.profit : row.original.profit
        const vFormatted = formatUsd(v)
        return (
          <span
            className={cn(
              'tabular-nums text-[10px] truncate font-medium',
              v >= 0 ? 'text-emerald-500' : 'text-rose-500',
            )}
            title={vFormatted}
          >
            {vFormatted}
          </span>
        )
      },
      Footer: () =>
        footerText ? (
          <span
            className={cn(
              'tabular-nums text-[10px] font-semibold whitespace-nowrap',
              summary!.profit >= 0 ? 'text-emerald-500' : 'text-rose-500',
            )}
          >
            {footerText}
          </span>
        ) : null,
    }
  })()

  const colRoi: MRT_ColumnDef<TableRow> = (() => {
    const footerText = summary ? formatRoi(toNumber(summary.roi)) : null
    return {
      accessorKey: 'roi',
      header: 'ROI',
      Header: <HeaderLabel>ROI</HeaderLabel>,
      size: autoSize(58, footerText),
      enableSorting: isSortable('roi'),
      Cell: ({ row }) => {
        const v = isGroupRow(row.original) ? row.original.group_summary.roi : row.original.roi
        const vFormatted = formatRoi(v)
        return (
          <span
            className={cn(
              'tabular-nums text-[10px] truncate font-medium',
              v >= 0 ? 'text-emerald-500' : 'text-rose-500',
            )}
            title={vFormatted}
          >
            {vFormatted}
          </span>
        )
      },
      Footer: () =>
        footerText ? (
          <span
            className={cn(
              'tabular-nums text-[10px] font-semibold whitespace-nowrap',
              summary!.roi >= 0 ? 'text-emerald-500' : 'text-rose-500',
            )}
          >
            {footerText}
          </span>
        ) : null,
    }
  })()

  // ── Realtime (rt_*) columns — top-level fields from BE, display-only ──
  const colRtClickAdCount = count('rt_click_ad_count', 'R. Conv.', 65, 'green')
  const colRtClickKeywordCount = count('rt_click_keyword_count', 'R. C.Kw', 100, 'green')
  const colRtViewSearchCount = count('rt_view_search_count', 'R. S.View', 78, 'green')
  const colRtViewArticleCount = count('rt_view_article_count', 'R. Article Views', 100, 'green')

  // ── Target CPA (Google only, editable) ──
  const colTargetCpa: MRT_ColumnDef<TableRow> = {
    accessorKey: 'target_cpa',
    header: 'tCPA',
    Header: <HeaderLabel icon="blue">tCPA</HeaderLabel>,
    size: autoSize(55, null),
    enableSorting: false,
    Cell: ({ row }) => {
      if (isGroupRow(row.original)) return null
      const r = row.original
      const isGoogle = (r.ads_type ?? '').toLowerCase() === 'google'
      if (!isGoogle) return <span className="text-foreground/50 text-[10px]">—</span>
      const value = toNumber(r.target_cpa)
      return (
        <button
          className={cn(
            'tabular-nums text-[10px] underline underline-offset-2 truncate cursor-pointer',
            value > 0 ? '' : 'text-rose-500',
          )}
          title="Edit target CPA"
          onClick={(e) => {
            e.stopPropagation()
            onOpenTargetCpa(r)
          }}
        >
          {value > 0 ? formatUsd(value) : 'Set'}
        </button>
      )
    },
  }

  // Column order matches AllReportResource.php
  return [
    // ── Group label (grouped mode only) ──
    ...(groupLabelCol ? [groupLabelCol] : []),

    // ── Identity / dimension (mirrors AllReport column order) ──
    colDateStart,
    colCampaignName,
    colCampaignId,
    colAccountName,
    colUserEmail,
    colTrackingAnalytic,
    colAdsAdsetReport,
    colCampaignStatus,
    colCampaignOnOff,
    colLink,
    colAdsType,
    colChannelName,

    // ── Revenue & spend ──
    usd('r_revenue', 'Rev', 70, 'yellow'),
    colRevenueEst,
    usd('a_spend', 'Spend', 78, 'blue'),
    colProfit,
    colRoi,
    colRoiRealtime,

    // ── Conversions ──
    colRtClickAdCount,
    count('r_conversion', 'Conv.', 70, 'yellow'),
    count('a_conversion', 'A. Conv.', 85, 'blue'),
    (() => {
      const footerText = summary ? formatDecimal(toNumber(summary.r_rpc), 2) : null
      return {
        accessorKey: 'r_rpc',
        header: 'RPC',
        Header: <HeaderLabel icon="yellow">RPC</HeaderLabel>,
        size: autoSize(70, footerText),
        enableSorting: SORTABLE_COLUMNS.has('r_rpc'),
        Cell: ({ row }) => {
          if (!isGroupRow(row.original) && groupBy !== 'account_id')
            return <span className="text-foreground/30 text-[10px]">—</span>
          const val = isGroupRow(row.original)
            ? toNumber(row.original.group_summary.r_rpc)
            : toNumber(row.original.r_rpc)
          const v = formatDecimal(val, 2)
          return (
            <span className="tabular-nums text-[10px] text-foreground truncate" title={v}>
              {v}
            </span>
          )
        },
        Footer: () =>
          footerText ? (
            <span className="tabular-nums text-[10px] font-semibold whitespace-nowrap">
              {footerText}
            </span>
          ) : null,
      } as MRT_ColumnDef<TableRow>
    })(),

    // ── CPA ──
    colRtCpa,
    ratio('r_cpa', 'CPA', 68, 2, 'yellow'),
    colTargetCpa,
    ratio('a_cpa', 'A. CPA', 85, 2, 'blue'),

    // ── Search impressions & RPM ──
    ratio('r_ad_requests_rpm', 'S. RPM', 70, 2, 'yellow'),
    count('r_impressions', 'Impr', 65, 'yellow'),

    // ── CVR ──
    colRtCvr,
    (() => {
      const footerText = summary ? `${formatDecimal(summary.cvr)}%` : null
      return {
        accessorKey: 'cvr',
        header: 'CVR',
        Header: <HeaderLabel icon="yellow">CVR</HeaderLabel>,
        size: autoSize(70, footerText),
        enableSorting: isSortable('cvr'),
        Cell: ({ row }) => {
          const v = isGroupRow(row.original) ? row.original.group_summary.cvr : row.original.cvr
          if (v === null || v === 0)
            return <span className="text-foreground/50 text-[10px]">—</span>
          const vFormatted = `${formatDecimal(v)}%`
          return (
            <span className="tabular-nums text-[10px] text-foreground truncate" title={vFormatted}>
              {vFormatted}
            </span>
          )
        },
        Footer: () =>
          footerText ? (
            <span className="tabular-nums text-[10px] font-semibold whitespace-nowrap">
              {footerText}
            </span>
          ) : null,
      } as MRT_ColumnDef<TableRow>
    })(),

    // ── Search views ──
    colRtViewSearchCount,
    count('r_search_views', 'S.Views', 80, 'yellow'),
    count('a_search_views', 'A. S.View', 98, 'blue'),

    // ── Kw / funnel ──
    colRtClickKeywordCount,
    count('r_funnel_clicks', 'C.Kw', 105, 'yellow'),
    count('a_clicks', 'A. C.Kw', 105, 'blue'),
    count('r_funnel_requests', 'Kw Request', 120, 'yellow'),
    colRtCtrKeyword,
    colCtrKeyword,
    count('r_funnel_impressions', 'Kw Impr', 105, 'yellow'),
    ratio('r_funnel_rpm', 'Kw RPM', 110, 2, 'yellow'),

    // ── CTR Search ──
    colRtCtrSearch,

    // ── A. platform metrics ──
    { ...ratio('a_ctr_link', 'A. CTR', 92, 2, 'blue'), Footer: undefined },
    {
      ...count('a_article_views', 'A. LP View', 100, 'blue'),
      Footer: undefined,
    },
    {
      ...ratio('a_cpc_link', 'A. CPC', 85, 2, 'blue'),
      Footer: undefined,
    },
    { ...count('a_reach', 'Reach', 75, 'blue'), Footer: undefined },
    {
      ...count('a_impressions', 'A. Impr', 85, 'blue'),
      Footer: undefined,
    },
    { ...ratio('a_cpm', 'CPM', 70, 2, 'blue'), Footer: undefined },
    { ...ratio('a_frequency', 'FB Freq', 82, 2, 'blue'), Footer: undefined },
    { ...ratio('a_ctr', 'FB CTR', 92, 2, 'blue'), Footer: undefined },
    {
      ...usd('daily_budget', 'A. Budget (Daily)', 100, 'blue'),
      Footer: undefined,
    },
    {
      ...usd('lifetime_budget', 'A. Budget (Lifetime)', 105, 'blue'),
      Footer: undefined,
    },

    // ── No AllReport equivalent — kept for completeness ──
    ratio('r_impressions_rpm', 'Impr RPM', 92, 2, 'yellow'),
    count('r_ad_requests', 'Ad Reqs', 82, 'yellow'),
    {
      ...count('a_ad_clicks', 'Ad Clicks', 88, 'blue'),
      Footer: undefined,
    },
    { ...ratio('a_cpc', 'A. CPC', 88, 2, 'blue'), Footer: undefined },
    colRtViewArticleCount,
  ]
}

// ─── Props & component ────────────────────────────────────────────────────────

type Props = {
  data: TableRow[]
  rowCount: number
  loading: boolean
  filters: CampaignReportFilterParams
  filterOptions: CampaignReportFiltersResponse['data']
  summary: CampaignReportSummary | null
  toggling: Record<string, boolean>
  userPermissions: string[]
  onPaginationChange: (page: number, perPage: number) => void
  onSortingChange: (orderBy: CampaignReportOrderBy | null, order: 'asc' | 'desc' | null) => void
  onToggleCampaignStatus: (campaignId: string, checked: boolean) => void
  onUpdateTargetCpa: (campaignId: string, targetCpa: number) => void
  role: RBACRole
}

function CampaignReportTableCardInner({
  data,
  rowCount,
  loading,
  filters,
  filterOptions,
  summary,
  toggling,
  userPermissions,
  onPaginationChange,
  onSortingChange,
  onToggleCampaignStatus,
  onUpdateTargetCpa,
  role,
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
  const [insightChartOpen, setInsightChartOpen] = useState(false)
  const [insightChartTarget, setInsightChartTarget] = useState<InsightChartDialogTarget | null>(
    null,
  )
  const [targetCpaOpen, setTargetCpaOpen] = useState(false)
  const [targetCpaTarget, setTargetCpaTarget] = useState<CampaignReportRow | null>(null)
  const [summaryOnly, setSummaryOnly] = useState(false)
  const [prevPerPage, setPrevPerPage] = useState<number | null>(null)
  const effectiveSummaryOnly = grouped && summaryOnly
  const { pathname } = useLocation()

  const { columnVisibility: userColumnVisibility, setColumnVisibility: setUserColumnVisibility } =
    useColumnVisibilityStorage(pathname)

  const forcedColumnVisibility = useMemo<Record<string, boolean>>(() => {
    const base: Record<string, boolean> = grouped ? { date_start: false } : { group_label: false }

    if (filters.group_by === 'user_id' || role.isMember) {
      base.user_email = false
    }

    if (filters.group_by === 'channel_code') {
      base.channel_name = false
    }
    if (filters.group_by === 'campaign_id') {
      base.campaign_id = false
      base.campaign_name = false
    }
    if (filters.group_by === 'account_id') {
      base.account_name = false
    }

    if (effectiveSummaryOnly) {
      base.account_name = false
      base.user_email = false
      base.tracking_analytic = false
      base.ads_adset_report = false
      base.campaign_id = false
      base.campaign_name = false
      base.campaign_status = false
      base.campaign_onoff = false
      base.link = false
      base.ads_type = false
      base.channel_name = false
    }

    return base
  }, [grouped, effectiveSummaryOnly, filters.group_by, role])

  const columnVisibility = useMemo(
    () => ({ ...userColumnVisibility, ...forcedColumnVisibility }),
    [userColumnVisibility, forcedColumnVisibility],
  )

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

  const openInsightChart = useCallback((target: InsightChartDialogTarget) => {
    setInsightChartTarget(target)
    setInsightChartOpen(true)
  }, [])

  const onInsightChartOpenChange = useCallback((next: boolean) => {
    setInsightChartOpen(next)
    if (!next) setInsightChartTarget(null)
  }, [])

  const openTargetCpa = useCallback((row: CampaignReportRow) => {
    setTargetCpaTarget(row)
    setTargetCpaOpen(true)
  }, [])

  const onTargetCpaOpenChange = useCallback((next: boolean) => {
    setTargetCpaOpen(next)
    if (!next) setTargetCpaTarget(null)
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
        openTargetCpa,
        canViewDeliveryReports,
        filters.date_from,
        filters.date_to,
        openRevenueRange,
        openRevenueChart,
        openInsightChart,
      ),
    [
      filters.group_by,
      filters.date_from,
      filters.date_to,
      grouped,
      onToggleCampaignStatus,
      openTrackingAnalytics,
      openDeliveryReport,
      openTargetCpa,
      canViewDeliveryReports,
      summary,
      toggling,
      openRevenueRange,
      openRevenueChart,
      openInsightChart,
    ],
  )

  const sorting = useMemo(
    () => (filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : []),
    [filters.order_by, filters.order],
  )

  const pinnedLeftColumns = useMemo(
    () =>
      isMobile ? [] : grouped ? ['group_label'] : ['date_start', 'campaign_name', 'campaign_id'],
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
    enableStickyHeader: true,
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
    enableColumnActions: false,
    enableHiding: true,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableColumnPinning: !isMobile,
    mantineTableHeadCellProps: {
      sx: {
        fontSize: '10px',
        paddingLeft: '2px !important',
        paddingRight: '2px !important',
        verticalAlign: 'middle',
        '& .mantine-TableHeadCell-Content': {
          justifyContent: 'flex-start',
          alignItems: 'center',
        },
        '& .mantine-TableHeadCell-Content-Wrapper': {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'normal',
          lineHeight: 1.1,
          display: 'flex',
          alignItems: 'center',
        },
        '& .mantine-TableHeadCell-Content-Labels': {
          flexWrap: 'nowrap',
          display: 'flex',
          alignItems: 'center',
        },
      },
    },
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
      expanded: grouped ? (effectiveSummaryOnly ? {} : true) : {},
      columnPinning: {
        left: pinnedLeftColumns,
      },
      columnVisibility,
    },
    onColumnVisibilityChange: (updater) => {
      setUserColumnVisibility((prev) => {
        const next =
          typeof updater === 'function' ? updater({ ...prev, ...forcedColumnVisibility }) : updater
        // Strip forced keys so forced visibility always wins
        const filtered = { ...next }
        for (const key of Object.keys(forcedColumnVisibility)) delete filtered[key]
        return filtered
      })
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
    enableRowVirtualization: !isMobile,
    rowVirtualizerProps: { overscan: 5 },
    enablePagination: true,
    paginationDisplayMode: 'pages',
    enableFullScreenToggle: false,
    mantineLoadingOverlayProps: {
      sx: { transform: 'translateX(var(--mrt-scroll-left, 0px))' },
    },
    mantineTableContainerProps: {
      className: 'campaign-report-table-container',
      onScroll: (e: React.UIEvent<HTMLDivElement>) => {
        e.currentTarget.style.setProperty('--mrt-scroll-left', `${e.currentTarget.scrollLeft}px`)
      },
      sx: {
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        maxHeight: 'calc(100vh - 182px)',
      },
    },
    mantineTableBodyRowProps: ({ row }) => {
      const isGroup = grouped && (row.getCanExpand() || isGroupRow(row.original))
      const isSubRow = row.depth > 0

      return {
        className: isGroup ? 'campaign-group-row' : undefined,
        sx: (theme) => {
          const isDark = theme.colorScheme === 'dark'
          if (isGroup) {
            return {
              fontWeight: 600,
              backgroundColor: isDark ? theme.colors.dark[6] : theme.colors.gray[1],
            }
          }
          if (isSubRow) {
            return { backgroundColor: isDark ? theme.colors.dark[8] : theme.white }
          }
          return { backgroundColor: isDark ? theme.colors.dark[7] : theme.white }
        },
      }
    },
    mantineTableBodyCellProps: ({ row, column }) => {
      const isGroup = grouped && (row.getCanExpand() || isGroupRow(row.original))
      const isCampaignCol = column.id === 'campaign_name'

      return {
        className: isGroup ? 'campaign-group-cell border-t border-[#3e3e3e]' : undefined,
        sx: {
          fontSize: '10px',
          paddingLeft: '2px !important',
          paddingRight: '2px !important',
          fontWeight: isGroup ? 600 : undefined,
          overflow: isCampaignCol ? 'visible' : 'hidden',
          textOverflow: isCampaignCol ? 'unset' : 'ellipsis',
          whiteSpace: isCampaignCol ? 'normal' : 'nowrap',
        },
      }
    },
    localization: { rowsPerPage: 'Per Page' },
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full flex-wrap items-center justify-between gap-2 border-b bg-muted/20 px-3 py-2">
        <h3 className="text-sm font-semibold text-foreground">Daily Campaign Reports</h3>
        <div className="flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
          <CampaignSchedulesDialog
            trigger={
              <Button size="sm" className="h-7 gap-1.5 px-2.5 text-xs font-medium">
                <CalendarClock className="h-3.5 w-3.5" />
                Campaign Schedules
              </Button>
            }
          />
          <CampaignRulesDialog
            trigger={
              <Button size="sm" className="h-7 gap-1.5 px-2.5 text-xs font-medium">
                <BookOpen className="h-3.5 w-3.5" />
                Campaign Rules
              </Button>
            }
          />
          <CampaignIdSelector
            filterOptions={filterOptions}
            role={role}
            trigger={
              <Button size="sm" className="h-7 gap-1.5 px-2.5 text-xs font-medium">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Campaign ID Selector
              </Button>
            }
          />
          {grouped && (
            <button
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors',
                effectiveSummaryOnly
                  ? 'border-orange-300 bg-orange-100 text-orange-700 hover:bg-orange-200 dark:border-orange-700 dark:bg-orange-900/60 dark:text-orange-300 dark:hover:bg-orange-800/60'
                  : 'border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
              )}
              onClick={() => {
                setSummaryOnly((v) => {
                  const next = !v
                  if (next) {
                    setPrevPerPage(filters.per_page ?? 30)
                    onPaginationChange(1, 1000000)
                  } else {
                    onPaginationChange(1, prevPerPage ?? filters.per_page ?? 30)
                    setPrevPerPage(null)
                  }
                  return next
                })
              }}
            >
              Totals Only
            </button>
          )}
          <MRT_ShowHideColumnsButton table={t} />
        </div>
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <BarChart3 className="h-8 w-8 text-foreground/30" />
        <p className="text-sm text-foreground">No campaign report data found.</p>
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
          initialAdsLinkId={trackingDialogTarget.realtime_report?.ads_link_id ?? null}
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

      {insightChartTarget && (
        <RevenueChartReportInternalDialog
          open={insightChartOpen}
          onOpenChange={onInsightChartOpenChange}
          channelCode={insightChartTarget.channelCode}
          channelName={insightChartTarget.channelName}
          initialDateFrom={insightChartTarget.dateFrom}
          initialDateTo={insightChartTarget.dateTo}
        />
      )}

      <TargetCpaFormDialog
        open={targetCpaOpen}
        onOpenChange={onTargetCpaOpenChange}
        row={targetCpaTarget}
        onSuccess={onUpdateTargetCpa}
      />
    </>
  )
}

export const CampaignReportTableCard = memo(CampaignReportTableCardInner)

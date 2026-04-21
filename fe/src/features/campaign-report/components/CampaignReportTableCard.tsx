import { memo, useMemo } from 'react'
import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  type MRT_ColumnDef,
  useMantineReactTable,
} from 'mantine-react-table'
import { BarChart3, Eye } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { StatusBadge } from '@/components/common/StatusBadge'
import type {
  CampaignReportDataRow,
  CampaignReportFilterParams,
  CampaignReportGroupBy,
  CampaignReportGroupRow,
  CampaignReportOrderBy,
  CampaignReportSummary,
} from '@/features/campaign-report/types'

type TableRow = CampaignReportDataRow

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

function isGroupRow(row: TableRow): row is CampaignReportGroupRow {
  return typeof row === 'object' && row !== null && 'is_group' in row && row.is_group === true
}

function getRowLink(row: TableRow): string | null {
  if (isGroupRow(row)) return null
  const link = row.link ?? null
  return link ? link : null
}

function metric(row: TableRow, key: keyof CampaignReportSummary): number {
  if (isGroupRow(row)) {
    return toNumber(row.group_summary[key])
  }
  return toNumber((row as unknown as Record<string, unknown>)[key as string])
}

function renderGroupLabel(row: CampaignReportGroupRow): React.ReactElement {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold text-foreground">
        {row.group_label ?? String(row.group_key ?? '—')}
      </span>
      <span className="text-[11px] text-muted-foreground">{row.record_count} record(s)</span>
    </div>
  )
}

function getColumns(
  summary: CampaignReportSummary | null,
  grouped: boolean,
  groupBy: CampaignReportGroupBy,
  toggling: Record<string, boolean>,
  onToggleCampaignStatus: (campaignId: string, checked: boolean, adsType: string | null) => void,
): MRT_ColumnDef<TableRow>[] {
  const groupLabelCol: MRT_ColumnDef<TableRow> | null = grouped
    ? {
        id: 'group_label',
        header:
          groupBy === 'channel_code'
            ? 'Channel'
            : groupBy === 'style_code'
              ? 'Style'
              : groupBy === 'account_id'
                ? 'Account'
                : groupBy === 'user_id'
                  ? 'User'
                  : groupBy === 'campaign_id'
                    ? 'Campaign'
                    : 'Group',
        size: 320,
        enableSorting: false,
        Cell: ({ row }) => {
          if (isGroupRow(row.original)) {
            return renderGroupLabel(row.original)
          }

          // Sub-row (campaign row): show date + campaign (like tracking-afs grouped view)
          const r = row.original
          return (
            <div className="flex flex-col">
              <span className="text-[11px] text-muted-foreground">{r.date_start ?? '—'}</span>
              <span className="text-xs font-medium text-foreground">
                {r.campaign_name ?? r.campaign_id}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">{r.campaign_id}</span>
            </div>
          )
        },
      }
    : null

  return [
    ...(groupLabelCol ? [groupLabelCol] : []),
    {
      accessorKey: 'date_start',
      header: 'Date',
      size: 110,
      enableSorting: !grouped,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) return null
        return (
          <span className="text-xs text-muted-foreground">{row.original.date_start ?? '—'}</span>
        )
      },
    },
    {
      accessorKey: 'campaign_name',
      header: 'Campaign',
      size: 220,
      enableSorting: !grouped,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) {
          // In grouped mode we keep group label visible in the table (like tracking-afs),
          // by rendering it in the Campaign column when grouping isn't on campaign_id.
          return null
        }
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
    },
    {
      accessorKey: 'campaign_status',
      header: 'Status',
      size: 110,
      enableSorting: !grouped,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) return null
        const status = row.original.campaign_status
        return <StatusBadge status={status} label={status ?? undefined} />
      },
    },
    {
      id: 'campaign_onoff',
      header: 'On/Off',
      size: 80,
      enableSorting: false,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) return null
        const r = row.original
        const campaignId = r.campaign_id
        const isActive = (r.campaign_status ?? '').toUpperCase() === 'ACTIVE'
        const disabled = Boolean(toggling[campaignId])

        return (
          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={isActive}
              disabled={disabled}
              aria-label={`Toggle status for ${campaignId}`}
              onCheckedChange={(checked) => {
                void onToggleCampaignStatus(campaignId, checked, r.ads_type)
              }}
            />
          </div>
        )
      },
    },
    {
      accessorKey: 'account_name',
      header: 'Account',
      size: 180,
      enableSorting: !grouped,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) {
          return null
        }
        return (
          <span className="text-xs text-muted-foreground">
            {row.original.account_name ?? row.original.account_id ?? '—'}
          </span>
        )
      },
    },
    {
      accessorKey: 'ads_type',
      header: 'Ads Type',
      size: 110,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) return <span className="text-muted-foreground/50">—</span>
        const val = row.original.ads_type
        return <StatusBadge status={val} label={val ?? undefined} />
      },
    },
    {
      accessorKey: 'link',
      header: 'Link',
      size: 110,
      enableSorting: false,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) return null

        const link = getRowLink(row.original)
        if (!link) {
          return <span className="text-muted-foreground/50">—</span>
        }

        return (
          <a
            className={cn(
              'inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline',
            )}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </a>
        )
      },
    },
    {
      accessorKey: 'daily_budget',
      header: '🔵 Daily Budget',
      size: 130,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {formatUsd(metric(row.original, 'daily_budget'))}
        </span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">
            {formatUsd(toNumber(summary.daily_budget))}
          </span>
        ) : null,
    },
    {
      accessorKey: 'lifetime_budget',
      header: '🔵 Lifetime Budget',
      size: 140,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {formatUsd(metric(row.original, 'lifetime_budget'))}
        </span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">
            {formatUsd(toNumber(summary.lifetime_budget))}
          </span>
        ) : null,
    },
    {
      accessorKey: 'channel_name',
      header: 'Channel',
      size: 150,
      enableSorting: !grouped,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) {
          return null
        }
        return (
          <span className="text-xs text-muted-foreground">
            {row.original.channel_name ?? row.original.channel_code ?? '—'}
          </span>
        )
      },
    },
    {
      accessorKey: 'style_name',
      header: 'Style',
      size: 150,
      enableSorting: !grouped,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) {
          return null
        }
        return (
          <span className="text-xs text-muted-foreground">
            {row.original.style_name ?? row.original.style_code ?? '—'}
          </span>
        )
      },
    },
    {
      accessorKey: 'style_code',
      header: 'Style Code',
      size: 130,
      enableSorting: !grouped,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) return null
        return (
          <span className="text-xs font-mono text-muted-foreground">
            {row.original.style_code ?? '—'}
          </span>
        )
      },
    },
    {
      accessorKey: 'channel_code',
      header: 'Channel Code',
      size: 140,
      enableSorting: !grouped,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) return null
        return (
          <span className="text-xs font-mono text-muted-foreground">
            {row.original.channel_code ?? '—'}
          </span>
        )
      },
    },
    {
      accessorKey: 'r_revenue',
      header: '🟡 Revenue',
      size: 120,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs font-medium">
          {formatUsd(metric(row.original, 'r_revenue'))}
        </span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">
            {formatUsd(toNumber(summary.r_revenue))}
          </span>
        ) : null,
    },
    {
      accessorKey: 'r_rpc',
      header: '🟡 RPC',
      size: 100,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {formatDecimal(metric(row.original, 'r_rpc'), 4)}
        </span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">
            {formatDecimal(toNumber(summary.r_rpc), 4)}
          </span>
        ) : null,
    },
    {
      accessorKey: 'r_search_views',
      header: '🟡 SearchViews',
      size: 160,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs">{metric(row.original, 'r_search_views')}</span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">{summary.r_search_views}</span>
        ) : null,
    },
    {
      accessorKey: 'r_ad_requests',
      header: '🟡 Ad Requests',
      size: 130,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs">{metric(row.original, 'r_ad_requests')}</span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">{summary.r_ad_requests}</span>
        ) : null,
    },
    {
      accessorKey: 'r_ad_requests_rpm',
      header: '🟡 Req. RPM',
      size: 110,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {formatDecimal(metric(row.original, 'r_ad_requests_rpm'), 4)}
        </span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">
            {formatDecimal(toNumber(summary.r_ad_requests_rpm), 4)}
          </span>
        ) : null,
    },
    {
      accessorKey: 'r_impressions',
      header: '🟡 Impressions',
      size: 160,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs">{metric(row.original, 'r_impressions')}</span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">{summary.r_impressions}</span>
        ) : null,
    },
    {
      accessorKey: 'r_impressions_rpm',
      header: '🟡 Impr. RPM',
      size: 120,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {formatDecimal(metric(row.original, 'r_impressions_rpm'), 4)}
        </span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">
            {formatDecimal(toNumber(summary.r_impressions_rpm), 4)}
          </span>
        ) : null,
    },
    {
      accessorKey: 'r_funnel_requests',
      header: '🟡 Funnel Requests',
      size: 150,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs">{metric(row.original, 'r_funnel_requests')}</span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">{summary.r_funnel_requests}</span>
        ) : null,
    },
    {
      accessorKey: 'r_funnel_clicks',
      header: '🟡 Funnel Clicks',
      size: 140,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs">{metric(row.original, 'r_funnel_clicks')}</span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">{summary.r_funnel_clicks}</span>
        ) : null,
    },
    {
      accessorKey: 'r_funnel_impressions',
      header: '🟡 Funnel Impr.',
      size: 140,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs">{metric(row.original, 'r_funnel_impressions')}</span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">{summary.r_funnel_impressions}</span>
        ) : null,
    },
    {
      accessorKey: 'r_funnel_rpm',
      header: '🟡 Funnel RPM',
      size: 120,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {formatDecimal(metric(row.original, 'r_funnel_rpm'), 4)}
        </span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">
            {formatDecimal(toNumber(summary.r_funnel_rpm), 4)}
          </span>
        ) : null,
    },
    {
      accessorKey: 'r_cpa',
      header: '🟡 Revenue CPA',
      size: 130,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {formatDecimal(metric(row.original, 'r_cpa'), 4)}
        </span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">
            {formatDecimal(toNumber(summary.r_cpa), 4)}
          </span>
        ) : null,
    },
    {
      accessorKey: 'a_spend',
      header: '🔵 Spending',
      size: 120,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {formatUsd(metric(row.original, 'a_spend'))}
        </span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">
            {formatUsd(toNumber(summary.a_spend))}
          </span>
        ) : null,
    },
    {
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
    },
    {
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
    },
    {
      accessorKey: 'r_conversion',
      header: 'Rev. Conv.',
      size: 110,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs">{metric(row.original, 'r_conversion')}</span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">{summary.r_conversion}</span>
        ) : null,
    },
    {
      accessorKey: 'a_conversion',
      header: '🔵 ADS Conv.',
      size: 110,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs">{metric(row.original, 'a_conversion')}</span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">{summary.a_conversion}</span>
        ) : null,
    },
    {
      id: 'rt_click_ad_count',
      header: '🟢 Realtime Clicks',
      size: 130,
      accessorFn: (row) => (isGroupRow(row) ? 0 : (row.realtime_report?.click_ad_count ?? 0)),
      enableSorting: false,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) return null
        const rt = row.original.realtime_report
        if (!rt) return <span className="text-muted-foreground/50">—</span>
        return <span className="tabular-nums text-xs">{rt.click_ad_count}</span>
      },
    },
    {
      id: 'rt_click_keyword_count',
      header: '🟢 Realtime Keyword Clicks',
      size: 170,
      accessorFn: (row) => (isGroupRow(row) ? 0 : (row.realtime_report?.click_keyword_count ?? 0)),
      enableSorting: false,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) return null
        const rt = row.original.realtime_report
        if (!rt) return <span className="text-muted-foreground/50">—</span>
        return <span className="tabular-nums text-xs">{rt.click_keyword_count}</span>
      },
    },
    {
      id: 'rt_view_search_count',
      header: '🟢 Realtime Search Views',
      size: 160,
      accessorFn: (row) => (isGroupRow(row) ? 0 : (row.realtime_report?.view_search_count ?? 0)),
      enableSorting: false,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) return null
        const rt = row.original.realtime_report
        if (!rt) return <span className="text-muted-foreground/50">—</span>
        return <span className="tabular-nums text-xs">{rt.view_search_count}</span>
      },
    },
    {
      id: 'rt_view_article_count',
      header: '🟢 Realtime Article Views',
      size: 160,
      accessorFn: (row) => (isGroupRow(row) ? 0 : (row.realtime_report?.view_article_count ?? 0)),
      enableSorting: false,
      Cell: ({ row }) => {
        if (isGroupRow(row.original)) return null
        const rt = row.original.realtime_report
        if (!rt) return <span className="text-muted-foreground/50">—</span>
        return <span className="tabular-nums text-xs">{rt.view_article_count}</span>
      },
    },
    {
      accessorKey: 'a_clicks',
      header: '🔵 Supply clicks',
      size: 110,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs">{metric(row.original, 'a_clicks')}</span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">{summary.a_clicks}</span>
        ) : null,
    },
    {
      accessorKey: 'a_ad_clicks',
      header: '🔵 Ad Clicks',
      size: 110,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs">{metric(row.original, 'a_ad_clicks')}</span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">{summary.a_ad_clicks}</span>
        ) : null,
    },
    {
      accessorKey: 'a_article_views',
      header: '🔵 Landingpage view',
      size: 150,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs">{metric(row.original, 'a_article_views')}</span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">{summary.a_article_views}</span>
        ) : null,
    },
    {
      accessorKey: 'a_search_views',
      header: '🔵 ADS SearchView',
      size: 140,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs">{metric(row.original, 'a_search_views')}</span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">{summary.a_search_views}</span>
        ) : null,
    },
    {
      accessorKey: 'a_impressions',
      header: '🔵 ADS Impressions',
      size: 120,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs">{metric(row.original, 'a_impressions')}</span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">{summary.a_impressions}</span>
        ) : null,
    },
    {
      accessorKey: 'a_reach',
      header: '🔵 ADS Reach',
      size: 110,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs">{metric(row.original, 'a_reach')}</span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">{summary.a_reach}</span>
        ) : null,
    },
    {
      accessorKey: 'a_cpc',
      header: '🔵 ADS CPC',
      size: 100,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {formatDecimal(metric(row.original, 'a_cpc'), 4)}
        </span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">
            {formatDecimal(toNumber(summary.a_cpc), 4)}
          </span>
        ) : null,
    },
    {
      accessorKey: 'a_cpm',
      header: '🔵 CPM',
      size: 100,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {formatDecimal(metric(row.original, 'a_cpm'), 4)}
        </span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">
            {formatDecimal(toNumber(summary.a_cpm), 4)}
          </span>
        ) : null,
    },
    {
      accessorKey: 'a_ctr',
      header: '🔵 FB CTR (All)',
      size: 100,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {formatDecimal(metric(row.original, 'a_ctr'), 4)}
        </span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">
            {formatDecimal(toNumber(summary.a_ctr), 4)}
          </span>
        ) : null,
    },
    {
      accessorKey: 'a_ctr_link',
      header: '🔵 ADS CTR',
      size: 110,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {formatDecimal(metric(row.original, 'a_ctr_link'), 4)}
        </span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">
            {formatDecimal(toNumber(summary.a_ctr_link), 4)}
          </span>
        ) : null,
    },
    {
      accessorKey: 'a_cpc_link',
      header: '🔵 ADS CPC Link',
      size: 110,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {formatDecimal(metric(row.original, 'a_cpc_link'), 4)}
        </span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">
            {formatDecimal(toNumber(summary.a_cpc_link), 4)}
          </span>
        ) : null,
    },
    {
      accessorKey: 'a_frequency',
      header: '🔵 Frequency',
      size: 110,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {formatDecimal(metric(row.original, 'a_frequency'), 4)}
        </span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">
            {formatDecimal(toNumber(summary.a_frequency), 4)}
          </span>
        ) : null,
    },
    {
      accessorKey: 'a_cpa',
      header: '🔵 ADS CPA',
      size: 110,
      Cell: ({ row }) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {formatDecimal(metric(row.original, 'a_cpa'), 4)}
        </span>
      ),
      Footer: () =>
        summary ? (
          <span className="tabular-nums text-xs font-semibold">
            {formatDecimal(toNumber(summary.a_cpa), 4)}
          </span>
        ) : null,
    },
  ]
}

type Props = {
  data: TableRow[]
  rowCount: number
  loading: boolean
  filters: CampaignReportFilterParams
  summary: CampaignReportSummary | null
  toggling: Record<string, boolean>
  onPaginationChange: (page: number, perPage: number) => void
  onSortingChange: (orderBy: CampaignReportOrderBy | null, order: 'asc' | 'desc' | null) => void
  onToggleCampaignStatus: (campaignId: string, checked: boolean, adsType: string | null) => void
}

function CampaignReportTableCardInner({
  data,
  rowCount,
  loading,
  filters,
  summary,
  toggling,
  onPaginationChange,
  onSortingChange,
  onToggleCampaignStatus,
}: Props) {
  const grouped = Boolean(filters.group_by)
  const columns = useMemo(
    () => getColumns(summary, grouped, filters.group_by ?? '', toggling, onToggleCampaignStatus),
    [filters.group_by, grouped, onToggleCampaignStatus, summary, toggling],
  )

  const sorting = useMemo(
    () => (filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : []),
    [filters.order_by, filters.order],
  )

  const table = useMantineReactTable({
    data,
    columns,
    getRowId: (row) =>
      isGroupRow(row) ? `group:${String(row.group_key ?? 'null')}` : String(row.id),
    getSubRows: (row) => (isGroupRow(row) ? row.items : []),
    manualPagination: true,
    manualSorting: true,
    rowCount,
    enableTableFooter: true,
    enableExpanding: grouped,
    enableExpandAll: false,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableColumnPinning: true,
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
    initialState: {
      density: 'xs',
    },
    state: {
      showLoadingOverlay: loading,
      pagination: {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? 30,
      },
      sorting,
      expanded: grouped ? true : {},
      columnPinning: {
        left: grouped ? ['group_label'] : ['date_start', 'campaign_name'],
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
    enablePagination: true,
    paginationDisplayMode: 'pages',
    enableFullScreenToggle: false,
    mantineTableContainerProps: { sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } },
    mantineTableBodyRowProps: ({ row }) => {
      const group = isGroupRow(row.original)
      const link = getRowLink(row.original)
      return {
        onClick: (e) => {
          if (
            (e.target as HTMLElement).closest(
              'a, button, input, textarea, select, [role="switch"], [role="menuitem"]',
            )
          ) {
            return
          }
          if (link) {
            window.open(link, '_blank', 'noopener,noreferrer')
          }
        },
        sx: (theme) => {
          const isDark = theme.colorScheme === 'dark'
          if (group) {
            return {
              backgroundColor: isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(99, 102, 241, 0.08)',
              fontWeight: 600,
              boxShadow: `inset 3px 0 0 0 ${theme.fn.primaryColor()}`,
              '&:hover': {
                backgroundColor: isDark
                  ? 'rgba(99, 102, 241, 0.24) !important'
                  : 'rgba(99, 102, 241, 0.14) !important',
              },
              '& td': {
                backgroundColor: 'transparent !important',
              },
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
    mantineTableBodyCellProps: ({ row, cell }) => {
      const group = isGroupRow(row.original)
      if (group) {
        return {
          sx: {
            fontWeight: 600,
            backgroundColor: 'transparent !important',
          },
        }
      }
      if (cell.column.id === 'group_label') {
        return { className: 'pl-8' }
      }
      return {}
    },
    localization: { rowsPerPage: 'Per Page' },
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full items-center justify-between gap-2 border-b bg-muted/20 px-3 py-2">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Daily Campaign Reports
        </h3>
        <div className="flex items-center gap-2">
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

  return <MantineReactTable table={table} />
}

export const CampaignReportTableCard = memo(CampaignReportTableCardInner)

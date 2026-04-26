import { memo, useMemo } from 'react'
import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  type MRT_ColumnDef,
  useMantineReactTable,
} from 'mantine-react-table'
import { BarChart3 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { TeamReportByTeamRow } from '@/features/team-report/types'

function formatUsd(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatRoi(value: number): string {
  return `${value.toFixed(2)}%`
}

function getColumns(): MRT_ColumnDef<TeamReportByTeamRow>[] {
  return [
    {
      accessorKey: 'team_name',
      header: 'Team',
      size: 200,
      Cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.team_name}</span>
      ),
    },
    {
      accessorKey: 'revenue',
      header: 'Revenue',
      size: 150,
      Cell: ({ row }) => <Badge variant="secondary">{formatUsd(row.original.revenue)}</Badge>,
    },
    {
      accessorKey: 'spend',
      header: 'Spend',
      size: 150,
      Cell: ({ row }) => (
        <span className="tabular-nums text-muted-foreground">{formatUsd(row.original.spend)}</span>
      ),
    },
    {
      accessorKey: 'profit',
      header: 'Profit',
      size: 150,
      Cell: ({ row }) => {
        const v = row.original.profit
        return (
          <span
            className={`tabular-nums font-medium ${v >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
          >
            {formatUsd(v)}
          </span>
        )
      },
    },
    {
      accessorKey: 'roi',
      header: 'ROI',
      size: 110,
      Cell: ({ row }) => {
        const v = row.original.roi
        return (
          <span
            className={`tabular-nums font-medium ${v >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
          >
            {formatRoi(v)}
          </span>
        )
      },
    },
  ]
}

type Props = {
  data: TeamReportByTeamRow[]
  loading: boolean
}

function TeamByTeamTableCardInner({ data, loading }: Props) {
  const columns = useMemo(() => getColumns(), [])

  const table = useMantineReactTable({
    data,
    columns,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enablePagination: false,
    enableSorting: true,
    enableFullScreenToggle: false,
    enableRowSelection: false,
    initialState: { density: 'md' },
    state: { showLoadingOverlay: loading },
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full flex-col border-b border-border bg-card">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-sm font-semibold text-foreground">Revenue by Team</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {data.length.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MRT_ShowHideColumnsButton table={t} />
          </div>
        </div>
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <BarChart3 className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">No team report rows found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting the selected date range or filters.
          </p>
        </div>
      </div>
    ),
  })

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Revenue by Team
      </h3>
      <MantineReactTable table={table} />
    </div>
  )
}

export const TeamReportByTeamTableCard = memo(TeamByTeamTableCardInner)

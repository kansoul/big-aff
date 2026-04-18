import { memo, useMemo } from 'react'
import { MantineReactTable, type MRT_ColumnDef, useMantineReactTable } from 'mantine-react-table'
import { BarChart3 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { RevenueByUserRow } from '@/features/revenue-report/types'

function formatUsd(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatRoi(value: number): string {
  return `${value.toFixed(2)}%`
}

function getColumns(): MRT_ColumnDef<RevenueByUserRow>[] {
  return [
    {
      accessorKey: 'user_name',
      header: 'User',
      size: 200,
      Cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.user_name}</span>
      ),
    },
    {
      accessorKey: 'team_name',
      header: 'Team',
      size: 180,
      Cell: ({ row }) => <span className="text-muted-foreground">{row.original.team_name}</span>,
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
  data: RevenueByUserRow[]
  loading: boolean
}

function RevenueByUserTableCardInner({ data, loading }: Props) {
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
    mantineTableContainerProps: { sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } },
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No user data found.</p>
      </div>
    ),
  })

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Revenue by User
      </h3>
      <MantineReactTable table={table} />
    </div>
  )
}

export const RevenueByUserTableCard = memo(RevenueByUserTableCardInner)

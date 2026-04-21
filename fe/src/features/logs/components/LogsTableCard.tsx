import { memo, useMemo } from 'react'
import { MantineReactTable, useMantineReactTable, type MRT_ColumnDef } from 'mantine-react-table'
import { RefreshCw, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { LogLevelBadge } from '@/features/logs/components/LogLevelBadge'
import type { LogEntry, LogFilters, LogPagination } from '@/features/logs/types'

const LOG_LEVEL_OPTIONS: { label: string; value: string }[] = [
  { label: 'Emergency', value: 'emergency' },
  { label: 'Alert', value: 'alert' },
  { label: 'Critical', value: 'critical' },
  { label: 'Error', value: 'error' },
  { label: 'Warning', value: 'warning' },
  { label: 'Notice', value: 'notice' },
  { label: 'Info', value: 'info' },
  { label: 'Debug', value: 'debug' },
]

type Props = {
  data: LogEntry[]
  pagination: LogPagination
  loading: boolean
  filters: LogFilters
  fileOptions: string[]
  onFilterChange: (filters: LogFilters) => void
  onFilterReset: () => void
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
  onRefresh: () => void
  onClear: () => void
  onRowClick: (entry: LogEntry) => void
}

const columns: MRT_ColumnDef<LogEntry>[] = [
  {
    accessorKey: 'timestamp',
    header: 'Timestamp',
    size: 180,
    Cell: ({ cell }) => (
      <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
        {cell.getValue<string>()}
      </span>
    ),
  },
  {
    accessorKey: 'level',
    header: 'Level',
    size: 100,
    Cell: ({ cell }) => <LogLevelBadge level={cell.getValue<string>()} />,
  },
  {
    accessorKey: 'channel',
    header: 'Channel',
    size: 110,
    Cell: ({ cell }) => (
      <span className="text-xs text-muted-foreground">{cell.getValue<string>()}</span>
    ),
  },
  {
    accessorKey: 'message',
    header: 'Message',
    Cell: ({ cell }) => (
      <span className="line-clamp-2 break-all font-mono text-sm">{cell.getValue<string>()}</span>
    ),
  },
]

export const LogsTableCard = memo(function LogsTableCard({
  data,
  pagination,
  loading,
  filters,
  fileOptions,
  onFilterChange,
  onFilterReset,
  onPageChange,
  onPerPageChange,
  onRefresh,
  onClear,
  onRowClick,
}: Props) {
  const fileSelectOptions = useMemo(
    () => fileOptions.map((f) => ({ label: f, value: f })),
    [fileOptions],
  )

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'file',
        label: 'Log File',
        type: 'select',
        value: filters.file ?? null,
        options: fileSelectOptions,
        placeholder: 'All files',
      },
      {
        field: 'level',
        label: 'Level',
        type: 'select',
        value: filters.level ?? null,
        options: LOG_LEVEL_OPTIONS,
        placeholder: 'All levels',
      },
      {
        field: 'keyword',
        label: 'Keyword',
        type: 'input',
        value: filters.keyword ?? null,
        placeholder: 'Search in message / stack trace...',
      },
    ],
    [filters, fileSelectOptions],
  )

  const table = useMantineReactTable({
    columns,
    data,
    manualPagination: true,
    rowCount: pagination.total,
    enableSorting: false,
    enableColumnActions: false,
    enableGlobalFilter: false,
    enableFilters: false,
    enableFullScreenToggle: false,
    paginationDisplayMode: 'pages',
    localization: { rowsPerPage: 'Per Page' },
    state: {
      showLoadingOverlay: loading,
      pagination: {
        pageIndex: pagination.current_page - 1,
        pageSize: pagination.per_page,
      },
    },
    onPaginationChange: (updater) => {
      const prev = { pageIndex: pagination.current_page - 1, pageSize: pagination.per_page }
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (next.pageIndex !== prev.pageIndex) onPageChange(next.pageIndex + 1)
      if (next.pageSize !== prev.pageSize) onPerPageChange(next.pageSize)
    },
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: () => onRowClick(row.original),
      style: { cursor: 'pointer' },
    }),
    renderTopToolbar: () => (
      <div className="flex w-full flex-col gap-4 rounded-md border bg-muted/20 p-4">
        <div className="flex w-full items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="destructive" size="sm" onClick={onClear} disabled={loading}>
            <Trash2 className="mr-1 h-4 w-4" />
            Clear
          </Button>
        </div>
        <FilterPanel
          fields={filterFields}
          onReset={onFilterReset}
          onFieldChange={(field, value) =>
            onFilterChange({
              ...filters,
              [field]: (value as string) || null,
            })
          }
        />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <p className="text-sm text-muted-foreground">No log entries found.</p>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
})

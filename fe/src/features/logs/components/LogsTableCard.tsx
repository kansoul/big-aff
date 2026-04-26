import { memo, useMemo } from 'react'
import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  useMantineReactTable,
  type MRT_ColumnDef,
} from 'mantine-react-table'
import { RefreshCw, Trash2 } from 'lucide-react'

import { ActiveFilterChips, type ActiveFilterChip } from '@/components/common/ActiveFilterChips'
import { Button } from '@/components/ui/button'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { LogLevelBadge } from '@/features/logs/components/LogLevelBadge'
import { useIsMobile } from '@/hooks/useMobile'
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
    Cell: ({ cell }) => {
      const msg = cell.getValue<string>()
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="line-clamp-2 break-all font-mono text-sm cursor-default">{msg}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm break-all text-xs font-mono">
              {msg}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
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
  const isMobile = useIsMobile()

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

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []

    if (filters.file) {
      chips.push({ key: 'file', label: 'Log File', displayValue: filters.file })
    }
    if (filters.level) {
      const opt = LOG_LEVEL_OPTIONS.find((option) => option.value === filters.level)
      chips.push({
        key: 'level',
        label: 'Level',
        displayValue: opt?.label ?? filters.level,
      })
    }
    if (filters.keyword) {
      chips.push({ key: 'keyword', label: 'Keyword', displayValue: `"${filters.keyword}"` })
    }

    return chips
  }, [filters])

  function handleRemoveChip(key: string) {
    if (key === 'file') {
      onFilterChange({ ...filters, file: null })
    } else if (key === 'level') {
      onFilterChange({ ...filters, level: null })
    } else if (key === 'keyword') {
      onFilterChange({ ...filters, keyword: null })
    }
  }

  const table = useMantineReactTable({
    columns,
    data,
    manualPagination: true,
    rowCount: pagination.total,
    enableSorting: false,
    enableColumnActions: false,
    enableColumnPinning: !isMobile,
    mantineTableContainerProps: {
      style: {
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      },
    },
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
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full flex-col border-b border-border bg-card">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <RefreshCw className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-sm font-semibold text-foreground">Application Logs</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {pagination.total.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs"
              onClick={onClear}
              disabled={loading}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
            <div className="h-4 w-px bg-border" />
            <MRT_ShowHideColumnsButton table={t} />
          </div>
        </div>
        <div className="border-t border-border/60 px-4 py-3">
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
        <ActiveFilterChips
          chips={activeChips}
          onRemove={handleRemoveChip}
          onClearAll={onFilterReset}
        />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <RefreshCw className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">No log entries found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your filters or refresh the logs.
          </p>
        </div>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
})

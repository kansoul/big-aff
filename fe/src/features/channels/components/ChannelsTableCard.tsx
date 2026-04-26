import { memo, useMemo } from 'react'
import {
  MantineReactTable,
  MRT_GlobalFilterTextInput,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
  MRT_ShowHideColumnsButton,
  MRT_ToggleGlobalFilterButton,
} from 'mantine-react-table'
import { Hash, Plus, Trash2, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/useMobile'
import type { Channel } from '@/features/channels/types'

type ChannelsTableCardProps = {
  loading: boolean
  channels: Channel[]
  canCreate: boolean
  canDelete: boolean
  canAssign: boolean
  onAddClick: () => void
  onAssignClick: () => void
  onDeleteRow: (row: Channel) => void
  selectedIds: Set<number>
  onSelectionChange: (updater: (prev: Set<number>) => Set<number>) => void
  onBulkDeleteClick: () => void
}

function getColumns(meta: {
  canDelete: boolean
  onDeleteRow: (row: Channel) => void
}): MRT_ColumnDef<Channel>[] {
  const { canDelete, onDeleteRow } = meta

  return [
    {
      accessorKey: 'name',
      header: 'Name',
      size: 200,
      Cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
    },
    {
      accessorKey: 'code',
      header: 'Code',
      size: 140,
      Cell: ({ row }) => (
        <span className="font-mono text-xs font-medium text-foreground">{row.original.code}</span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      size: 160,
      Cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : '—'}
        </span>
      ),
    },
    ...(canDelete
      ? [
          {
            id: 'actions',
            header: 'Action',
            size: 90,
            enableSorting: false,
            enableGlobalFilter: false,
            enableHiding: false,
            mantineTableHeadCellProps: {
              sx: { width: 90, '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
            },
            mantineTableBodyCellProps: { style: { width: 90 } },
            Cell: ({ row }: { row: { original: Channel } }) => (
              <TooltipProvider>
                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onDeleteRow(row.original)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Delete
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            ),
          } satisfies MRT_ColumnDef<Channel>,
        ]
      : []),
  ]
}

function ChannelsTableCardInner({
  loading,
  channels,
  canCreate,
  canDelete,
  canAssign,
  onAddClick,
  onAssignClick,
  onDeleteRow,
  selectedIds,
  onSelectionChange,
  onBulkDeleteClick,
}: ChannelsTableCardProps) {
  const isMobile = useIsMobile()
  const columns = useMemo(() => getColumns({ canDelete, onDeleteRow }), [canDelete, onDeleteRow])
  const rowSelection = useMemo<MRT_RowSelectionState>(
    () => Object.fromEntries(channels.map((row) => [String(row.id), selectedIds.has(row.id)])),
    [channels, selectedIds],
  )

  const table = useMantineReactTable({
    data: channels,
    columns,
    getRowId: (row) => String(row.id),
    enableColumnFilters: false,
    enableGlobalFilter: true,
    enableRowSelection: canDelete,
    enableColumnPinning: !isMobile,
    positionGlobalFilter: 'left',
    positionToolbarAlertBanner: 'none',
    initialState: {
      showGlobalFilter: true,
      density: 'md',
    },
    state: {
      showLoadingOverlay: loading,
      rowSelection,
      columnPinning: { right: isMobile ? [] : ['actions'] },
    },
    onRowSelectionChange: (updater) => {
      const newPageSelection: MRT_RowSelectionState =
        typeof updater === 'function' ? updater(rowSelection) : updater
      onSelectionChange((prev) => {
        const next = new Set(prev)
        for (const row of channels) next.delete(row.id)
        for (const [idStr, checked] of Object.entries(newPageSelection)) {
          if (checked) next.add(Number(idStr))
        }
        return next
      })
    },
    enablePagination: true,
    paginationDisplayMode: 'pages',
    enableFullScreenToggle: false,
    mantineTableContainerProps: { sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } },
    mantineSearchTextInputProps: {
      placeholder: 'Search by name or code…',
      sx: { minWidth: 'clamp(120px, 40vw, 260px)' },
    },
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full flex-col border-b border-border bg-card">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Hash className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-sm font-semibold text-foreground">Channels</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {channels.length.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {canDelete && selectedIds.size > 0 ? (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-7 gap-1.5 px-2.5 text-xs font-semibold"
                  onClick={onBulkDeleteClick}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete {selectedIds.size} selected
                </Button>
                <div className="h-4 w-px bg-border" />
              </>
            ) : null}
            {canAssign ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 px-2.5 text-xs font-medium"
                onClick={onAssignClick}
              >
                <Users className="h-3.5 w-3.5" />
                Assign
              </Button>
            ) : null}
            {canCreate ? (
              <Button
                size="sm"
                className="h-7 gap-1.5 px-2.5 text-xs font-medium"
                onClick={onAddClick}
              >
                <Plus className="h-3.5 w-3.5" />
                Create
              </Button>
            ) : null}
            {(canAssign || canCreate) && <div className="h-4 w-px bg-border" />}
            <MRT_ToggleGlobalFilterButton table={t} />
            <MRT_ShowHideColumnsButton table={t} />
          </div>
        </div>
        {t.getState().showGlobalFilter ? (
          <div className="border-t border-border/60 px-4 py-3">
            <MRT_GlobalFilterTextInput table={t} />
          </div>
        ) : null}
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Hash className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">No channels found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your search or create a new channel.
          </p>
        </div>
      </div>
    ),
  })

  return <MantineReactTable table={table} />
}

export const ChannelsTableCard = memo(ChannelsTableCardInner)

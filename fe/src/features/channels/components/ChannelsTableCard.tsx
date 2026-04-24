import { memo, useMemo } from 'react'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_RowSelectionState,
  MRT_ShowHideColumnsButton,
  MRT_ToggleGlobalFilterButton,
} from 'mantine-react-table'
import { Hash, Plus, Trash2, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
    {
      id: 'actions',
      header: 'Action',
      size: 80,
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      mantineTableHeadCellProps: {
        sx: { width: 80, '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
      },
      mantineTableBodyCellProps: { style: { width: 80 } },
      Cell: ({ row }) =>
        canDelete ? (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              aria-label="Delete"
              onClick={() => onDeleteRow(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null,
    } satisfies MRT_ColumnDef<Channel>,
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
    localization: { rowsPerPage: 'Per Page' },
    renderToolbarInternalActions: ({ table: t }) => (
      <div className="flex items-center gap-1">
        {canDelete && selectedIds.size > 0 ? (
          <>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide"
              onClick={onBulkDeleteClick}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selectedIds.size})
            </Button>
            <div className="mx-1 h-5 w-px bg-border" />
          </>
        ) : null}
        {canAssign ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide"
              onClick={onAssignClick}
            >
              <Users className="h-3.5 w-3.5" />
              Assign
            </Button>
            <div className="mx-1 h-5 w-px bg-border" />
          </>
        ) : null}
        {canCreate ? (
          <>
            <Button
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide"
              onClick={onAddClick}
            >
              <Plus className="h-3.5 w-3.5" />
              Create
            </Button>
            <div className="mx-1 h-5 w-px bg-border" />
          </>
        ) : null}
        <MRT_ToggleGlobalFilterButton table={t} />
        <MRT_ShowHideColumnsButton table={t} />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <Hash className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No channels found.</p>
      </div>
    ),
  })

  return (
    <Card className="overflow-hidden border-border shadow-none">
      <CardContent className="p-0">
        <MantineReactTable table={table} />
      </CardContent>
    </Card>
  )
}

export const ChannelsTableCard = memo(ChannelsTableCardInner)

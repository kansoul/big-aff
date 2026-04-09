import { memo, useMemo } from 'react'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  MRT_ToggleGlobalFilterButton,
} from 'mantine-react-table'
import { AlertCircle, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { Style } from '@/features/styles/types'

type StylesTableCardProps = {
  listError: string | null
  loading: boolean
  styles: Style[]
  canCreate: boolean
  canDelete: boolean
  onAddClick: () => void
  onDeleteRow: (row: Style) => void
}

function getColumns(meta: {
  canDelete: boolean
  onDeleteRow: (row: Style) => void
}): MRT_ColumnDef<Style>[] {
  const { canDelete, onDeleteRow } = meta

  return [
    {
      accessorKey: 'name',
      header: 'Name',
      size: 200,
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
        <span className="text-muted-foreground text-xs">
          {row.original.created_at ? new Date(row.original.created_at).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 80,
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      mantineTableHeadCellProps: {
        sx: { '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
      },
      Cell: ({ row }) =>
        canDelete ? (
          <div className="flex justify-end">
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
    },
  ]
}

function StylesTableCardInner({
  listError,
  loading,
  styles,
  canCreate,
  canDelete,
  onAddClick,
  onDeleteRow,
}: StylesTableCardProps) {
  const columns = useMemo(() => getColumns({ canDelete, onDeleteRow }), [canDelete, onDeleteRow])

  const table = useMantineReactTable({
    data: styles,
    columns,
    enableColumnFilters: false,
    enableGlobalFilter: true,
    positionGlobalFilter: 'left',
    initialState: { showGlobalFilter: true, density: 'md' },
    state: { showLoadingOverlay: loading },
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
        {canCreate ? (
          <Button
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide"
            onClick={onAddClick}
          >
            <Plus className="h-3.5 w-3.5" />
            Create
          </Button>
        ) : null}
        <div className="mx-1 h-5 w-px bg-border" />
        <MRT_ToggleGlobalFilterButton table={t} />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <p className="text-sm text-muted-foreground">No styles found.</p>
      </div>
    ),
  })

  return (
    <>
      {listError ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{listError}</p>
        </div>
      ) : null}
      <MantineReactTable table={table} />
    </>
  )
}

export const StylesTableCard = memo(StylesTableCardInner)

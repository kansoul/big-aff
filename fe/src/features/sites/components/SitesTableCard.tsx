import { memo, useMemo, type Dispatch, type SetStateAction } from 'react'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  type MRT_SortingState,
  MRT_ShowHideColumnsButton,
  MRT_ToggleGlobalFilterButton,
} from 'mantine-react-table'
import { Eye, Globe, Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Site, SiteFilterParams, SiteStatus } from '@/features/sites/types'

type PaginationState = { pageIndex: number; pageSize: number }

const STATUS_CONFIG: Record<SiteStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className:
      'inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20',
  },
  maintenance: {
    label: 'Maintenance',
    className:
      'inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border',
  },
  suspended: {
    label: 'Suspended',
    className:
      'inline-flex items-center rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive ring-1 ring-inset ring-destructive/20',
  },
}

type ActionMeta = {
  canUpdate: boolean
  canDelete: boolean
  onView: (site: Site) => void
  onEdit: (site: Site) => void
  onDelete: (site: Site) => void
}

function getSitesColumns(meta: ActionMeta): MRT_ColumnDef<Site>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      size: 180,
      Cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
    },
    {
      accessorKey: 'url',
      header: 'URL',
      size: 220,
      Cell: ({ row }) => (
        <a
          href={row.original.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:opacity-80 truncate max-w-full"
        >
          {row.original.url}
        </a>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 130,
      Cell: ({ row }) => {
        const status = row.original.status
        const config = STATUS_CONFIG[status]
        if (!config) return <span className="text-muted-foreground/50">—</span>
        return <span className={config.className}>{config.label}</span>
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      size: 150,
      Cell: ({ row }) => {
        const d = row.original.created_at
        if (!d) return <span className="text-muted-foreground/50">—</span>
        return <span className="text-muted-foreground">{new Date(d).toLocaleString()}</span>
      },
    },
    {
      accessorKey: 'updated_at',
      header: 'Updated',
      size: 150,
      Cell: ({ row }) => {
        const d = row.original.updated_at
        if (!d) return <span className="text-muted-foreground/50">—</span>
        return <span className="text-muted-foreground">{new Date(d).toLocaleString()}</span>
      },
    },
    ...(meta.canUpdate || meta.canDelete
      ? [
          {
            id: 'actions',
            header: 'Action',
            size: 80,
            enableSorting: false,
            enableGlobalFilter: false,
            enableHiding: false,
            mantineTableHeadCellProps: {
              sx: {
                width: 80,
                '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' },
              },
            },
            mantineTableBodyCellProps: { style: { width: 80 } },
            Cell: ({ row }: { row: { original: Site } }) => (
              <div className="flex justify-end gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => meta.onView(row.original)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                {meta.canUpdate ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => meta.onEdit(row.original)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
                {meta.canDelete ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => meta.onDelete(row.original)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            ),
          } satisfies MRT_ColumnDef<Site>,
        ]
      : []),
  ]
}

type SitesTableCardProps = {
  data: Site[]
  rowCount: number
  loading: boolean
  pagination: PaginationState
  onPaginationChange: Dispatch<SetStateAction<PaginationState>>
  filters: SiteFilterParams
  globalFilter: string
  onGlobalFilterChange: (value: string) => void
  onFilterChange: (field: keyof SiteFilterParams, value: string | null) => void
  onSortingChange: (sorting: MRT_SortingState) => void
  canCreate: boolean
  onCreateClick: () => void
  canUpdate: boolean
  onViewClick: (site: Site) => void
  onEditClick: (site: Site) => void
  canDelete: boolean
  onDeleteClick: (site: Site) => void
}

function SitesTableCardInner({
  data,
  rowCount,
  loading,
  pagination,
  onPaginationChange,
  filters,
  globalFilter,
  onGlobalFilterChange,
  onFilterChange,
  onSortingChange,
  canCreate,
  onCreateClick,
  canUpdate,
  onViewClick,
  onEditClick,
  canDelete,
  onDeleteClick,
}: SitesTableCardProps) {
  const columns = useMemo(
    () =>
      getSitesColumns({
        canUpdate,
        canDelete,
        onView: onViewClick,
        onEdit: onEditClick,
        onDelete: onDeleteClick,
      }),
    [canUpdate, canDelete, onViewClick, onEditClick, onDeleteClick],
  )

  const sorting: MRT_SortingState = useMemo(
    () => (filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : []),
    [filters.order_by, filters.order],
  )

  const table = useMantineReactTable({
    data,
    columns,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    rowCount,
    onPaginationChange,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      onSortingChange(next)
    },
    onGlobalFilterChange: (updater) => {
      const next = typeof updater === 'function' ? updater(globalFilter) : updater
      onGlobalFilterChange(next ?? '')
    },
    enableColumnFilters: false,
    enableGlobalFilter: true,
    positionGlobalFilter: 'left',
    enableFullScreenToggle: false,
    enableColumnPinning: true,
    initialState: {
      showGlobalFilter: true,
      density: 'md',
      columnVisibility: { updated_at: false },
      columnPinning: { right: ['actions'] },
    },
    state: { pagination, isLoading: loading, sorting, globalFilter },
    enablePagination: true,
    paginationDisplayMode: 'pages',
    mantineTableContainerProps: { sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } },
    mantineSearchTextInputProps: {
      placeholder: 'Search by name or URL…',
      sx: { minWidth: 'clamp(120px, 40vw, 260px)' },
    },
    localization: { rowsPerPage: 'Per Page' },
    renderToolbarInternalActions: ({ table: t }) => (
      <div className="flex items-center gap-2">
        <Select
          value={filters.status ?? '__all__'}
          onValueChange={(v) => onFilterChange('status', v === '__all__' ? null : v)}
        >
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
        {canCreate ? (
          <Button
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide"
            onClick={onCreateClick}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Site
          </Button>
        ) : null}
        <div className="mx-1 h-5 w-px bg-border" />
        <MRT_ToggleGlobalFilterButton table={t} />
        <MRT_ShowHideColumnsButton table={t} />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <Globe className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No sites found.</p>
      </div>
    ),
  })

  return (
    <Card className="mt-4 overflow-hidden border-border shadow-none">
      <CardContent className="p-0">
        <MantineReactTable table={table} />
      </CardContent>
    </Card>
  )
}

export const SitesTableCard = memo(SitesTableCardInner)

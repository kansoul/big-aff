import { memo, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import {
  MantineReactTable,
  MRT_ShowHideColumnsButton,
  type MRT_ColumnDef,
  type MRT_SortingState,
  useMantineReactTable,
} from 'mantine-react-table'
import { FileUp, Loader2, RefreshCw, Repeat, Save } from 'lucide-react'

import { ActiveFilterChips } from '@/components/common/ActiveFilterChips'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type {
  ConversionField,
  GoogleConversion,
  GoogleConversionDraftMap,
  GoogleConversionFilterParams,
} from '@/features/google-conversions/types'
import { useColumnVisibilityStorage } from '@/hooks/useColumnVisibilityStorage'
import { useIsMobile } from '@/hooks/useMobile'
import { cn } from '@/lib/utils'

const FIELDS: Array<{ field: ConversionField; header: string }> = [
  { field: 'page_view', header: 'Page View' },
  { field: 'redirect', header: 'Redirect' },
  { field: 'submit_form', header: 'Submit Form' },
]

type Props = {
  conversions: GoogleConversion[]
  loading: boolean
  saving: boolean
  rowCount: number
  filters: GoogleConversionFilterParams
  drafts: GoogleConversionDraftMap
  dirtyCount: number
  canUpdate: boolean
  canCreate: boolean
  onFilterChange: (patch: Partial<GoogleConversionFilterParams>) => void
  onDraftChange: (id: number, field: ConversionField, value: string) => void
  onSaveChanges: () => void
  onImportClick: () => void
  onReload: () => void
}

function GoogleConversionsTableCardInner(props: Props) {
  const isMobile = useIsMobile()
  const { columnVisibility, setColumnVisibility } = useColumnVisibilityStorage(
    useLocation().pathname,
    {},
  )
  const columns = useMemo<MRT_ColumnDef<GoogleConversion>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'ID',
        size: 65,
        Cell: ({ row }) => (
          <span className="font-mono text-[11px] text-muted-foreground">#{row.original.id}</span>
        ),
      },
      { accessorKey: 'account_name', header: 'Account', size: 240 },
      ...FIELDS.map(
        ({ field, header }): MRT_ColumnDef<GoogleConversion> => ({
          id: field,
          header,
          size: 190,
          enableSorting: false,
          Cell: ({ row }) => {
            const value =
              props.drafts[row.original.id]?.[field] ?? row.original.conversion?.[field] ?? ''
            return (
              <Input
                value={value}
                aria-label={`${header} for ${row.original.account_name}`}
                placeholder="Conversion ID"
                disabled={!props.canUpdate || props.saving}
                className={cn(
                  'h-7 min-w-36 font-mono text-xs',
                  props.drafts[row.original.id]?.[field] !== undefined && 'border-primary/50',
                )}
                onChange={(event) =>
                  props.onDraftChange(row.original.id, field, event.target.value)
                }
              />
            )
          },
        }),
      ),
    ],
    [props],
  )
  const sorting = useMemo<MRT_SortingState>(
    () =>
      props.filters.order_by
        ? [{ id: props.filters.order_by, desc: props.filters.order === 'desc' }]
        : [],
    [props.filters.order, props.filters.order_by],
  )
  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'query',
        label: 'Search',
        type: 'input',
        value: props.filters.query ?? null,
        placeholder: 'Search account name or ID…',
      },
    ],
    [props.filters.query],
  )
  const pageIndex = (props.filters.page ?? 1) - 1
  const pageSize = props.filters.per_page ?? 15
  const table = useMantineReactTable({
    data: props.conversions,
    columns,
    getRowId: (row) => String(row.id),
    manualPagination: true,
    manualSorting: true,
    rowCount: props.rowCount,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableColumnPinning: !isMobile,
    enableFullScreenToggle: false,
    initialState: { density: 'xs' },
    state: {
      pagination: { pageIndex, pageSize },
      sorting,
      showLoadingOverlay: props.loading,
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const current = { pageIndex, pageSize }
      const next = typeof updater === 'function' ? updater(current) : updater
      props.onFilterChange({ page: next.pageIndex + 1, per_page: next.pageSize })
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      props.onFilterChange({
        order_by: (next[0]?.id as GoogleConversionFilterParams['order_by']) ?? null,
        order: next[0] ? (next[0].desc ? 'desc' : 'asc') : null,
        page: 1,
      })
    },
    paginationDisplayMode: 'pages',
    localization: { rowsPerPage: 'Per Page' },
    renderTopToolbar: ({ table: currentTable }) => (
      <div className="flex w-full flex-col border-b border-border bg-card">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <Repeat className="h-4 w-4 text-muted-foreground/60" />
            <span className="text-sm font-semibold">Google Conversions</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {props.rowCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {props.canUpdate ? (
              <Button
                size="sm"
                className="h-7 gap-1.5 px-2.5 text-xs"
                disabled={props.saving || props.dirtyCount === 0}
                onClick={props.onSaveChanges}
              >
                {props.saving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Save{props.dirtyCount > 0 ? ` (${props.dirtyCount})` : ''}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 px-2.5 text-xs"
              disabled={props.loading}
              onClick={props.onReload}
            >
              <RefreshCw className={cn('h-3.5 w-3.5', props.loading && 'animate-spin')} />
              Reload
            </Button>
            {props.canCreate ? (
              <Button
                size="sm"
                className="h-7 gap-1.5 px-2.5 text-xs"
                onClick={props.onImportClick}
              >
                <FileUp className="h-3.5 w-3.5" />
                Import
              </Button>
            ) : null}
            <div className="h-4 w-px bg-border" />
            <MRT_ShowHideColumnsButton table={currentTable} />
          </div>
        </div>
        <div className="border-t border-border/60 px-4 py-3">
          <FilterPanel
            fields={filterFields}
            applyMode
            onApply={(values) => {
              const query = typeof values.query === 'string' ? values.query.trim() : ''
              props.onFilterChange({ query: query || null, page: 1 })
            }}
            onReset={() => props.onFilterChange({ query: null, page: 1 })}
          />
        </div>
        <ActiveFilterChips
          chips={
            props.filters.query
              ? [{ key: 'query', label: 'Search', displayValue: `“${props.filters.query}”` }]
              : []
          }
          onRemove={() => props.onFilterChange({ query: null, page: 1 })}
          onClearAll={() => props.onFilterChange({ query: null, page: 1 })}
        />
      </div>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <Repeat className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm font-medium">No conversion records found</p>
      </div>
    ),
  })
  return <MantineReactTable table={table} />
}

export const GoogleConversionsTableCard = memo(GoogleConversionsTableCardInner)

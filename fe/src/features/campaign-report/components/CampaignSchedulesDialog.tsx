import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarClock,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn, getPageNumbers } from '@/lib/utils'
import { campaignReportApi } from '@/features/campaign-report/api'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import type {
  CampaignScheduleFilterParams,
  CampaignScheduleOrderBy,
  CampaignScheduleRow,
} from '@/features/campaign-report/types'
import { CampaignScheduleFormDialog } from './CampaignScheduleFormDialog'

// ─── Column definitions ───────────────────────────────────────────────────────

type ColDef = {
  key: keyof CampaignScheduleRow
  label: string
  orderBy?: CampaignScheduleOrderBy
  className?: string
  render: (row: CampaignScheduleRow) => React.ReactNode
}

const COLUMNS: ColDef[] = [
  {
    key: 'name',
    label: 'Name',
    orderBy: 'name',
    className: 'min-w-[200px]',
    render: (row) => <span className="font-medium text-foreground">{row.name}</span>,
  },
  {
    key: 'turn_on_time',
    label: 'Turn On',
    orderBy: 'turn_on_time',
    className: 'min-w-[100px]',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground/95">{row.turn_on_time ?? '—'}</span>
    ),
  },
  {
    key: 'turn_off_time',
    label: 'Turn Off',
    orderBy: 'turn_off_time',
    className: 'min-w-[100px]',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground/95">{row.turn_off_time ?? '—'}</span>
    ),
  },
  {
    key: 'items_count',
    label: 'Items',
    className: 'text-right min-w-[70px]',
    render: (row) => (
      <span className="tabular-nums text-muted-foreground/95">{row.items_count}</span>
    ),
  },
  {
    key: 'creator',
    label: 'Creator',
    className: 'min-w-[120px]',
    render: (row) => <span className="text-muted-foreground">{row.creator?.name ?? '—'}</span>,
  },
]

// ─── Sort header ──────────────────────────────────────────────────────────────

type SortHeaderProps = {
  col: ColDef
  orderBy: CampaignScheduleOrderBy | null | undefined
  order: 'asc' | 'desc' | null | undefined
  onSort: (orderBy: CampaignScheduleOrderBy | null, order: 'asc' | 'desc' | null) => void
}

function SortHeader({ col, orderBy, order, onSort }: SortHeaderProps) {
  if (!col.orderBy) return <span>{col.label}</span>

  const isActive = orderBy === col.orderBy
  const currentOrder = isActive ? order : null

  function handleClick() {
    if (!isActive || currentOrder === null) {
      onSort(col.orderBy!, 'desc')
    } else if (currentOrder === 'desc') {
      onSort(col.orderBy!, 'asc')
    } else {
      onSort(null, null)
    }
  }

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
      onClick={handleClick}
    >
      {col.label}
      {isActive && currentOrder === 'desc' ? (
        <ArrowDown className="h-3 w-3" />
      ) : isActive && currentOrder === 'asc' ? (
        <ArrowUp className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

const PER_PAGE_OPTIONS = [
  { label: '30', value: '30' },
  { label: '50', value: '50' },
  { label: '100', value: '100' },
]

type PaginationBarProps = {
  page: number
  perPage: number
  rowCount: number
  onPaginationChange: (page: number, perPage: number) => void
}

function PaginationBar({ page, perPage, rowCount, onPaginationChange }: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(rowCount / perPage))
  const pageNumbers = getPageNumbers(page, totalPages)

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-muted/25 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Per Page</span>
        <Select value={String(perPage)} onValueChange={(v) => onPaginationChange(1, Number(v))}>
          <SelectTrigger size="sm" className="w-16 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PER_PAGE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground sm:hidden">
          {page}/{totalPages}
        </span>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button
          size="icon"
          variant="outline"
          className="hidden h-7 w-7 sm:inline-flex"
          disabled={page <= 1}
          aria-label="First page"
          onClick={() => onPaginationChange(1, perPage)}
        >
          <ChevronFirst className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="h-7 w-7"
          disabled={page <= 1}
          aria-label="Previous page"
          onClick={() => onPaginationChange(page - 1, perPage)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        {pageNumbers.map((p, i) =>
          p === '...' ? (
            <span
              key={`ellipsis-${i}`}
              className="hidden h-7 w-7 items-center justify-center text-xs text-muted-foreground sm:flex"
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'secondary' : 'outline'}
              size="icon"
              className={cn('hidden h-7 w-7 text-xs sm:inline-flex', p === page && 'font-semibold')}
              disabled={p === page}
              onClick={() => onPaginationChange(p, perPage)}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={page >= totalPages}
          aria-label="Next page"
          onClick={() => onPaginationChange(page + 1, perPage)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="hidden h-7 w-7 sm:inline-flex"
          disabled={page >= totalPages}
          aria-label="Last page"
          onClick={() => onPaginationChange(totalPages, perPage)}
        >
          <ChevronLast className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: CampaignScheduleFilterParams = {
  page: 1,
  per_page: 30,
}

type CampaignSchedulesDialogProps = {
  trigger?: React.ReactNode
  initialCampaignId?: string | null
}

function CampaignSchedulesDialogInner({
  trigger,
  initialCampaignId,
}: CampaignSchedulesDialogProps) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<CampaignScheduleRow[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [fetching, setFetching] = useState(false)
  const [filters, setFilters] = useState<CampaignScheduleFilterParams>({
    ...DEFAULT_FILTERS,
    campaign_id: initialCampaignId ?? null,
  })
  const [campaignOptions, setCampaignOptions] = useState<{ label: string; value: string }[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<CampaignScheduleRow | null>(null)
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set())
  const [deleteItem, setDeleteItem] = useState<CampaignScheduleRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) return
    void campaignReportApi
      .filters()
      .then(({ data: res }) => {
        setCampaignOptions(
          res.data.campaigns.map((c) => ({
            label: c.campaign_name ? `${c.campaign_name} (${c.campaign_id})` : c.campaign_id,
            value: c.campaign_id,
          })),
        )
      })
      .catch(() => {
        toast.error('Failed to load campaign options')
      })
  }, [open])

  const loadData = useCallback(async (activeFilters: CampaignScheduleFilterParams) => {
    try {
      setFetching(true)
      const { data: response } = await campaignReportApi.listCampaignSchedules(activeFilters)
      setData(response.data)
      setRowCount(response.pagination.total)
    } catch {
      toast.error('Failed to load campaign schedules')
      setData([])
      setRowCount(0)
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void loadData(filters)
  }, [open, loadData, filters])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (!next) {
        setFilters({ ...DEFAULT_FILTERS, campaign_id: initialCampaignId ?? null })
        setData([])
        setRowCount(0)
      }
    },
    [initialCampaignId],
  )

  const onSort = useCallback(
    (orderBy: CampaignScheduleOrderBy | null, order: 'asc' | 'desc' | null) => {
      setFilters((prev) => ({
        ...prev,
        order_by: orderBy ?? undefined,
        order: order ?? undefined,
        page: 1,
      }))
    },
    [],
  )

  const onPaginationChange = useCallback((page: number, perPage: number) => {
    setFilters((prev) => ({ ...prev, page, per_page: perPage }))
  }, [])

  const onFilterApply = useCallback((values: Record<string, unknown>) => {
    setFilters((prev) => ({
      ...prev,
      name: (values.name as string | null) || null,
      campaign_id: (values.campaign_id as string | null) || null,
      is_active: values.is_active === 'true' ? true : values.is_active === 'false' ? false : null,
      page: 1,
    }))
  }, [])

  const handleToggleActive = useCallback(async (row: CampaignScheduleRow) => {
    const newValue = !row.is_active
    setData((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: newValue } : r)))
    setTogglingIds((prev) => new Set(prev).add(row.id))
    try {
      await campaignReportApi.updateCampaignSchedule(row.id, { is_active: newValue })
    } catch {
      setData((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_active: row.is_active } : r)))
      toast.error('Failed to update schedule status')
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
    }
  }, [])

  const handleDelete = useCallback(async () => {
    if (!deleteItem) return
    try {
      setDeleting(true)
      await campaignReportApi.deleteCampaignSchedule(deleteItem.id)
      toast.success('Schedule deleted successfully')
      setDeleteItem(null)
      void loadData(filters)
    } catch {
      toast.error('Failed to delete schedule')
    } finally {
      setDeleting(false)
    }
  }, [deleteItem, filters, loadData])

  const onFilterReset = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, campaign_id: initialCampaignId ?? null })
  }, [initialCampaignId])

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'name',
        label: 'Name',
        type: 'input',
        value: filters.name ?? null,
        placeholder: 'Search by name…',
      },
      {
        field: 'campaign_id',
        label: 'Campaign',
        type: 'select',
        value: filters.campaign_id ?? null,
        options: campaignOptions,
        placeholder: 'All campaigns',
      },
      {
        field: 'is_active',
        label: 'Status',
        type: 'select',
        value: filters.is_active === true ? 'true' : filters.is_active === false ? 'false' : null,
        options: [
          { label: 'Active', value: 'true' },
          { label: 'Inactive', value: 'false' },
        ],
      },
    ],
    [filters.name, filters.campaign_id, filters.is_active, campaignOptions],
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm">Campaign Schedules</Button>}
      </DialogTrigger>
      <DialogContent
        className="flex h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 p-0 sm:h-[95vh] sm:w-[95vw] sm:max-w-[95vw]"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              <DialogTitle>Campaign Schedules</DialogTitle>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide whitespace-nowrap"
                onClick={() => {
                  setEditItem(null)
                  setFormOpen(true)
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                New Schedule
              </Button>
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
          <FilterPanel
            fields={filterFields}
            onReset={onFilterReset}
            applyMode
            onApply={onFilterApply}
            defaultOpen={true}
          />
          <div className="rounded-xl border border-border/70 bg-card shadow-sm">
            <div className="relative overflow-auto">
              {fetching && data.length > 0 && (
                <div className="absolute inset-0 z-20 flex items-start justify-end bg-background/40 pr-4 pt-4 backdrop-blur-[1px]">
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-card px-2.5 py-1.5 text-xs text-muted-foreground shadow-sm ring-1 ring-border/60">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading…
                  </div>
                </div>
              )}
              <Table className="text-[13px]">
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="h-14 border-border/70 bg-muted/45 hover:bg-muted/45">
                    {COLUMNS.map((col) => (
                      <TableHead
                        key={col.key}
                        className={cn(
                          'h-14 whitespace-nowrap bg-transparent text-[12px] font-semibold tracking-[0.08em] text-muted-foreground capitalize',
                          col.className,
                        )}
                      >
                        <SortHeader
                          col={col}
                          orderBy={filters.order_by}
                          order={filters.order}
                          onSort={onSort}
                        />
                      </TableHead>
                    ))}
                    <TableHead className="h-14 min-w-20 bg-transparent text-[12px] font-semibold tracking-[0.08em] text-muted-foreground capitalize">
                      Active
                    </TableHead>
                    <TableHead className="h-14 w-15 bg-transparent" />
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {fetching && data.length === 0 && (
                    <TableRow className="h-20 border-border/70 hover:bg-transparent">
                      <TableCell
                        colSpan={COLUMNS.length + 2}
                        className="h-20 whitespace-normal text-center"
                      >
                        <div className="inline-flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading schedules...
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {!fetching && data.length === 0 && (
                    <TableRow className="h-20 border-border/70 hover:bg-transparent">
                      <TableCell
                        colSpan={COLUMNS.length + 2}
                        className="h-20 whitespace-normal text-center"
                      >
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <CalendarClock className="h-7 w-7 opacity-30" />
                          <p className="text-sm">No schedules found.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {data.map((row) => (
                    <TableRow
                      key={row.id}
                      className="h-14 border-border/70 bg-background hover:bg-muted/20"
                    >
                      {COLUMNS.map((col) => (
                        <TableCell key={col.key} className={col.className}>
                          {col.render(row)}
                        </TableCell>
                      ))}
                      <TableCell className="min-w-20">
                        <Switch
                          checked={row.is_active}
                          disabled={togglingIds.has(row.id)}
                          onCheckedChange={() => void handleToggleActive(row)}
                        />
                      </TableCell>
                      <TableCell className="min-w-[150px] text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                            aria-label={`Edit schedule ${row.name}`}
                            onClick={() => {
                              setEditItem(row)
                              setFormOpen(true)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-destructive"
                            aria-label={`Delete schedule ${row.name}`}
                            onClick={() => setDeleteItem(row)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <PaginationBar
              page={filters.page ?? 1}
              perPage={filters.per_page ?? 30}
              rowCount={rowCount}
              onPaginationChange={onPaginationChange}
            />
          </div>
        </div>
      </DialogContent>

      <CampaignScheduleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editItem={editItem}
        onSuccess={() => void loadData(filters)}
      />

      <AlertDialog
        open={!!deleteItem}
        onOpenChange={(o) => {
          if (!o) setDeleteItem(null)
        }}
      >
        <AlertDialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">{deleteItem?.name}</span>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={deleting} onClick={() => void handleDelete()}>
              {deleting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

export const CampaignSchedulesDialog = memo(CampaignSchedulesDialogInner)

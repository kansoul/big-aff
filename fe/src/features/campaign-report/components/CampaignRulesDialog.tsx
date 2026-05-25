import dayjs from '@/lib/dayjs'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  CampaignRuleFilterParams,
  CampaignRuleOrderBy,
  CampaignRuleRow,
} from '@/features/campaign-report/types'
import { CampaignRuleFormDialog } from './CampaignRuleFormDialog'

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtCurrency(val: string | null): string {
  if (val == null) return '—'
  const n = parseFloat(val)
  if (isNaN(n)) return val
  const formatted = Math.abs(n).toLocaleString('vi-VN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return n < 0 ? `-$${formatted}` : `$${formatted}`
}

function fmtPercent(val: string | null): string {
  if (val == null) return '—'
  return `${val}%`
}

// ─── Column definitions ───────────────────────────────────────────────────────

type ColDef = {
  key: string
  label: string
  orderBy?: CampaignRuleOrderBy
  className?: string
  render: (row: CampaignRuleRow) => React.ReactNode
}

type ActionCallbacks = {
  onToggleActive: (row: CampaignRuleRow) => void | Promise<void>
  onEdit: (row: CampaignRuleRow) => void
  onDelete: (row: CampaignRuleRow) => void
}

function buildColumns(actions: ActionCallbacks): ColDef[] {
  return [
    {
      key: 'user',
      label: 'User',
      className: 'min-w-[140px]',
      render: (row) => (
        <span className="text-xs text-muted-foreground">{row.user?.email ?? '—'}</span>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      orderBy: 'title',
      className: 'min-w-[180px]',
      render: (row) => <span className="font-medium text-foreground">{row.title}</span>,
    },
    {
      key: 'code_rule',
      label: 'Code',
      className: 'min-w-[160px]',
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.code_rule}</span>
      ),
    },
    {
      key: 'is_active',
      label: 'Active',
      className: 'min-w-[70px]',
      render: (row) => (
        <Switch
          checked={row.is_active}
          onCheckedChange={() => {
            void actions.onToggleActive(row)
          }}
          aria-label="Active status"
        />
      ),
    },
    {
      key: 'entity_type',
      label: 'Entity',
      orderBy: 'entity_type',
      className: 'min-w-[110px]',
      render: (row) => (
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
          {row.entity_type === 'campaign' ? 'Campaign' : 'Ad/Adset'}
        </span>
      ),
    },
    {
      key: 'min_roi',
      label: 'Min ROI',
      className: 'min-w-[90px] text-right',
      render: (row) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {fmtPercent(row.min_roi)}
        </span>
      ),
    },
    {
      key: 'min_profit',
      label: 'Min Profit',
      className: 'min-w-[100px] text-right',
      render: (row) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {fmtCurrency(row.min_profit)}
        </span>
      ),
    },
    {
      key: 'min_spend',
      label: 'Min Spend',
      className: 'min-w-[100px] text-right',
      render: (row) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {fmtCurrency(row.min_spend)}
        </span>
      ),
    },
    {
      key: 'min_revenue',
      label: 'Min Revenue',
      className: 'min-w-[110px] text-right',
      render: (row) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {fmtCurrency(row.min_revenue)}
        </span>
      ),
    },
    {
      key: 'expired_at',
      label: 'Expiration Date',
      orderBy: 'expired_at',
      className: 'min-w-[140px]',
      render: (row) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {row.expired_at ? dayjs(row.expired_at).format('YYYY-MM-DD') : '—'}
        </span>
      ),
    },
    {
      key: 'time_apply',
      label: 'Time Apply',
      className: 'min-w-[160px]',
      render: (row) => {
        if (!row.start_hour && !row.end_hour)
          return <span className="text-muted-foreground/50">—</span>
        return (
          <span className="tabular-nums text-xs text-muted-foreground">
            {row.start_hour ?? '?'} - {row.end_hour ?? '?'}
          </span>
        )
      },
    },
    {
      key: 'actions',
      label: '',
      className: 'w-[140px] text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => actions.onEdit(row)}
          >
            <Pencil className="h-3 w-3" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={() => actions.onDelete(row)}
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
        </div>
      ),
    },
  ]
}

// ─── Sort header ──────────────────────────────────────────────────────────────

type SortHeaderProps = {
  col: ColDef
  orderBy: CampaignRuleOrderBy | null | undefined
  order: 'asc' | 'desc' | null | undefined
  onSort: (orderBy: CampaignRuleOrderBy | null, order: 'asc' | 'desc' | null) => void
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
          variant="outline"
          size="icon"
          className="hidden h-7 w-7 sm:inline-flex"
          disabled={page <= 1}
          aria-label="First page"
          onClick={() => onPaginationChange(1, perPage)}
        >
          <ChevronFirst className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
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

// ─── Delete confirm dialog ────────────────────────────────────────────────────

type DeleteConfirmDialogProps = {
  item: CampaignRuleRow | null
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function DeleteConfirmDialog({ item, onOpenChange, onSuccess }: DeleteConfirmDialogProps) {
  const [deleting, setDeleting] = useState(false)

  const onConfirm = async () => {
    if (!item) return
    try {
      setDeleting(true)
      await campaignReportApi.deleteCampaignRule(item.id)
      toast.success('Rule deleted successfully')
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error('Failed to delete campaign rule')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={!!item} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Rule</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">{item?.title}</span>? This action cannot
            be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={deleting} onClick={() => void onConfirm()}>
            {deleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                Delete
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: CampaignRuleFilterParams = {
  page: 1,
  per_page: 30,
}

type CampaignRulesDialogProps = {
  trigger?: React.ReactNode
}

function CampaignRulesDialogInner({ trigger }: CampaignRulesDialogProps) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<CampaignRuleRow[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [fetching, setFetching] = useState(false)
  const [filters, setFilters] = useState<CampaignRuleFilterParams>(DEFAULT_FILTERS)
  const [formOpen, setFormOpen] = useState(false)
  const [editItem, setEditItem] = useState<CampaignRuleRow | null>(null)
  const [deleteItem, setDeleteItem] = useState<CampaignRuleRow | null>(null)

  const loadData = useCallback(async (activeFilters: CampaignRuleFilterParams) => {
    try {
      setFetching(true)
      const { data: response } = await campaignReportApi.listCampaignRules(activeFilters)
      setData(response.data)
      setRowCount(response.pagination.total)
    } catch {
      toast.error('Failed to load campaign rules')
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

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next)
    if (!next) {
      setFilters(DEFAULT_FILTERS)
      setData([])
      setRowCount(0)
    }
  }, [])

  const onSort = useCallback(
    (orderBy: CampaignRuleOrderBy | null, order: 'asc' | 'desc' | null) => {
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
    const keyword = typeof values.keyword === 'string' ? values.keyword.trim() : ''

    setFilters((prev) => ({
      ...prev,
      keyword: keyword || null,
      entity_type:
        values.entity_type === 'campaign' || values.entity_type === 'ad_adset'
          ? values.entity_type
          : null,
      is_active: values.is_active === 'true' ? true : values.is_active === 'false' ? false : null,
      page: 1,
    }))
  }, [])

  const onFilterReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const onToggleActive = useCallback(
    async (row: CampaignRuleRow) => {
      try {
        await campaignReportApi.updateCampaignRule(row.id, { is_active: !row.is_active })
        void loadData(filters)
      } catch {
        toast.error('Failed to update rule status')
      }
    },
    [loadData, filters],
  )

  const onEdit = useCallback((row: CampaignRuleRow) => {
    setEditItem(row)
    setFormOpen(true)
  }, [])

  const onDelete = useCallback((row: CampaignRuleRow) => {
    setDeleteItem(row)
  }, [])

  const columns = useMemo(
    () => buildColumns({ onToggleActive, onEdit, onDelete }),
    [onToggleActive, onEdit, onDelete],
  )

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'keyword',
        label: 'Keyword',
        type: 'input',
        value: filters.keyword ?? null,
        placeholder: 'Title, code, user...',
      },
      {
        field: 'entity_type',
        label: 'Entity Type',
        type: 'select',
        value: filters.entity_type ?? null,
        options: [
          { label: 'Campaign', value: 'campaign' },
          { label: 'Ad/Adset', value: 'ad_adset' },
        ],
        placeholder: 'All types',
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
    [filters.keyword, filters.entity_type, filters.is_active],
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger ?? <Button size="sm">Campaign Rules</Button>}</DialogTrigger>
      <DialogContent
        className="flex h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 p-0 sm:h-[95vh] sm:w-[95vw] sm:max-w-[95vw]"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <DialogTitle>Campaign Rules</DialogTitle>
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
                New Rule
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
                    {columns.map((col) => (
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
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {fetching && data.length === 0 && (
                    <TableRow className="h-20 border-border/70 hover:bg-transparent">
                      <TableCell
                        colSpan={columns.length}
                        className="h-20 whitespace-normal text-center"
                      >
                        <div className="inline-flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading rules...
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {!fetching && data.length === 0 && (
                    <TableRow className="h-20 border-border/70 hover:bg-transparent">
                      <TableCell
                        colSpan={columns.length}
                        className="h-20 whitespace-normal text-center"
                      >
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <ShieldCheck className="h-7 w-7 opacity-30" />
                          <p className="text-sm">No rules found.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {data.map((row) => (
                    <TableRow
                      key={row.id}
                      className="h-14 border-border/70 bg-background hover:bg-muted/20"
                    >
                      {columns.map((col) => (
                        <TableCell key={col.key} className={col.className}>
                          {col.render(row)}
                        </TableCell>
                      ))}
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

      <CampaignRuleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editItem={editItem}
        onSuccess={() => void loadData(filters)}
      />

      <DeleteConfirmDialog
        item={deleteItem}
        onOpenChange={(open) => !open && setDeleteItem(null)}
        onSuccess={() => void loadData(filters)}
      />
    </Dialog>
  )
}

export const CampaignRulesDialog = memo(CampaignRulesDialogInner)

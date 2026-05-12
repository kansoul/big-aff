import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { PaginationMeta, SortDirection } from '@/features/adx/types'
import { cn } from '@/lib/utils'

export const SOURCE_OPTIONS = ['google', 'facebook', 'native', 'other']
export const STATUS_OPTIONS = ['active', 'inactive', 'paused', 'archived']
export const ACCOUNT_STATUS_OPTIONS = ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DISABLED']
export const CONVERSION_TYPE_OPTIONS = [
  'landing_view',
  'get_game_link_click',
  'detail_view',
  'get_bonus_click',
] as const

export function HumanText({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground/50">-</span>
  return <span className="truncate">{value.replaceAll('_', ' ')}</span>
}

export function MonoText({
  value,
  className,
}: {
  value: string | null | undefined
  className?: string
}) {
  if (!value) return <span className="text-muted-foreground/50">-</span>
  return <span className={cn('font-mono text-xs text-foreground', className)}>{value}</span>
}

export function StatusPill({ value }: { value: string | null | undefined }) {
  const normalized = (value ?? '').toLowerCase()
  const variant =
    normalized === 'active' || normalized === 'enabled'
      ? 'success'
      : normalized === 'paused'
        ? 'warning'
        : normalized === 'inactive' || normalized === 'archived'
          ? 'secondary'
          : 'outline'

  return (
    <Badge variant={variant} className="capitalize">
      {value ?? 'unknown'}
    </Badge>
  )
}

export function DateText({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground/50">-</span>
  return <span className="text-muted-foreground">{new Date(value).toLocaleString()}</span>
}

export type SortState<T extends string> = {
  order_by: T | null
  order: SortDirection | null
}

export function SortButton<T extends string>({
  column,
  sort,
  onSort,
  children,
}: {
  column: T
  sort: SortState<T>
  onSort: (column: T) => void
  children: ReactNode
}) {
  const active = sort.order_by === column
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 text-left font-medium',
        active && 'text-foreground',
      )}
      onClick={() => onSort(column)}
    >
      {children}
      <ChevronsUpDown className={cn('size-3.5 opacity-50', active && 'opacity-90')} />
    </button>
  )
}

export function Toolbar({
  title,
  subtitle,
  canCreate,
  createLabel,
  onCreate,
  children,
}: {
  title: string
  subtitle: string
  canCreate?: boolean
  createLabel?: string
  onCreate?: () => void
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {children}
        {canCreate && onCreate ? (
          <Button size="sm" className="gap-1.5" onClick={onCreate}>
            <Plus className="size-3.5" />
            {createLabel ?? 'Create'}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function TableShell({
  loading,
  emptyText,
  colSpan,
  children,
}: {
  loading: boolean
  emptyText: string
  colSpan: number
  children: ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
      <Table>{children}</Table>
      {loading ? (
        <div className="flex items-center justify-center gap-2 border-t border-border/70 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading...
        </div>
      ) : null}
      {!loading ? (
        <Table className="hidden">
          <TableBody>
            <TableRow>
              <TableCell colSpan={colSpan}>{emptyText}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      ) : null}
    </div>
  )
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-28 text-center text-sm text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  )
}

export function RowActions<T>({
  row,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: {
  row: T
  canUpdate: boolean
  canDelete: boolean
  onEdit: (row: T) => void
  onDelete: (row: T) => void
}) {
  if (!canUpdate && !canDelete) return null

  return (
    <div className="flex justify-end gap-1">
      {canUpdate ? (
        <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(row)}>
          <Pencil className="size-3.5" />
        </Button>
      ) : null}
      {canDelete ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(row)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      ) : null}
    </div>
  )
}

export function PaginationBar({
  pagination,
  onPageChange,
  onPageSizeChange,
}: {
  pagination: PaginationMeta | null
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}) {
  if (!pagination) return null

  return (
    <div className="flex flex-col gap-3 border-t border-border/70 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {pagination.from ?? 0}-{pagination.to ?? 0} of {pagination.total}
      </span>
      <div className="flex items-center gap-2">
        <select
          value={pagination.per_page}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
        >
          {[10, 15, 25, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={pagination.current_page <= 1}
          onClick={() => onPageChange(pagination.current_page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-20 text-center text-xs">
          {pagination.current_page} / {pagination.last_page}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={pagination.current_page >= pagination.last_page}
          onClick={() => onPageChange(pagination.current_page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export { TableBody, TableCell, TableHead, TableHeader, TableRow }

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  ArrowRight,
  CalendarClock,
  ChevronDown,
  Loader2,
  Plus,
  Search,
  Trash2,
  X,
  CalendarRange,
} from 'lucide-react'
import { toast } from 'sonner'

import { campaignReportApi } from '@/features/campaign-report/api'
import type {
  RevenueReportRangeItem,
  RevenueReportRangeRow,
} from '@/features/campaign-report/types'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { SearchableSelect } from '@/components/common/SearchableSelect'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// ─── Time Select ─────────────────────────────────────────────────────────────

function generateTimeOptions() {
  const options: { label: string; value: string }[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      options.push({ label: `${hh}:${mm}`, value: `${hh}:${mm}` })
    }
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()
type ChannelOption = { code: string; name: string | null }

type TimeSelectProps = {
  value: string
  onChange: (v: string) => void
}

function TimeSelect({ value, onChange }: TimeSelectProps) {
  return (
    <SearchableSelect
      value={value || undefined}
      onValueChange={onChange}
      options={TIME_OPTIONS}
      placeholder="00:00"
      className="h-8 text-xs"
    />
  )
}

// ─── Channels Multiselect ─────────────────────────────────────────────────────

type ChannelsSelectProps = {
  value: string[]
  onChange: (v: string[]) => void
  options: ChannelOption[]
}

function ChannelsSelect({ value, onChange, options }: ChannelsSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? options.filter(
        (o) =>
          (o.name ?? o.code).toLowerCase().includes(search.toLowerCase()) ||
          o.code.toLowerCase().includes(search.toLowerCase()),
      )
    : options

  function toggle(code: string) {
    onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code])
  }

  const triggerText =
    value.length === 0
      ? 'Select channels...'
      : value.length === 1
        ? (options.find((o) => o.code === value[0])?.name ?? value[0])
        : `${value.length} selected`

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-8 w-full justify-between gap-1.5 px-2.5 text-xs font-normal',
            value.length === 0 && 'text-muted-foreground',
          )}
        >
          <span className="flex-1 truncate text-left">{triggerText}</span>
          {value.length > 0 ? (
            <span
              role="button"
              aria-label="Clear"
              onClick={(e) => {
                e.stopPropagation()
                onChange([])
              }}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </span>
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-52 overflow-y-auto py-1" onWheel={(e) => e.stopPropagation()}>
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No results</p>
          ) : (
            filtered.map((opt) => (
              <label
                key={opt.code}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-muted"
              >
                <Checkbox
                  checked={value.includes(opt.code)}
                  onCheckedChange={() => toggle(opt.code)}
                />
                <span className="truncate">{opt.name}</span>
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Range Row ────────────────────────────────────────────────────────────────

type RangeErrors = Partial<
  Record<'start_date' | 'start_time' | 'end_date' | 'end_time' | 'channel_codes', string>
>

type RangeRowProps = {
  range: RangeState
  channelOptions: ChannelOption[]
  errors: RangeErrors
  onChange: (patch: Partial<RangeState>, clearField?: keyof RangeErrors) => void
  onRemove: () => void
  canRemove: boolean
  index: number
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[11px] text-destructive">{message}</p>
}

const QUICK_RANGES = [
  { label: '5m', minutes: 5 },
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
  { label: '6h', minutes: 360 },
  { label: '1d', minutes: 1440 },
]

function addMinutesToDateTime(
  date: string,
  time: string,
  minutes: number,
): { date: string; time: string } {
  const localDateTime = new Date(`${date}T${time}:00`)
  if (Number.isNaN(localDateTime.getTime())) {
    return { date, time }
  }

  localDateTime.setMinutes(localDateTime.getMinutes() + minutes)
  // Snap to nearest 5-min slot available in TIME_OPTIONS.
  const snappedM = Math.floor(localDateTime.getMinutes() / 5) * 5
  localDateTime.setMinutes(snappedM, 0, 0)

  const yyyy = localDateTime.getFullYear()
  const mm = String(localDateTime.getMonth() + 1).padStart(2, '0')
  const dd = String(localDateTime.getDate()).padStart(2, '0')
  const hh = String(localDateTime.getHours()).padStart(2, '0')

  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${String(snappedM).padStart(2, '0')}`,
  }
}

function RangeRow({
  range,
  channelOptions,
  errors,
  onChange,
  onRemove,
  canRemove,
  index,
}: RangeRowProps) {
  const labelId = useId()

  function applyQuickRange(minutes: number) {
    if (!range.start_date || !range.start_time) return
    const end = addMinutesToDateTime(range.start_date, range.start_time, minutes)
    onChange({ end_date: end.date, end_time: end.time })
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Time Ranges &nbsp;
          {index + 1}
        </span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-7 gap-1 px-2 text-xs text-destructive/60 hover:text-destructive"
            aria-label="Remove range"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${labelId}-sd`} className="text-xs text-muted-foreground">
            Start Date<span className="text-destructive">*</span>
          </Label>
          <DatePicker
            value={range.start_date}
            onChange={(v) => onChange({ start_date: v ?? '' }, 'start_date')}
            placeholder="Start Date"
          />
          <FieldError message={errors.start_date} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${labelId}-st`} className="text-xs text-muted-foreground">
            Start Time<span className="text-destructive">*</span>
          </Label>
          <TimeSelect
            value={range.start_time}
            onChange={(v: string) => onChange({ start_time: v }, 'start_time')}
          />
          <FieldError message={errors.start_time} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${labelId}-ed`} className="text-xs text-muted-foreground">
            End Date<span className="text-destructive">*</span>
          </Label>
          <DatePicker
            value={range.end_date}
            onChange={(v) => onChange({ end_date: v ?? '' }, 'end_date')}
            placeholder="End Date"
          />
          <FieldError message={errors.end_date} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${labelId}-et`} className="text-xs text-muted-foreground">
            End Time<span className="text-destructive">*</span>
          </Label>
          <TimeSelect
            value={range.end_time}
            onChange={(v: string) => onChange({ end_time: v }, 'end_time')}
          />
          <FieldError message={errors.end_time} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">
            Channels<span className="text-destructive">*</span>
          </Label>
          <ChannelsSelect
            value={range.channel_codes}
            onChange={(v) => onChange({ channel_codes: v }, 'channel_codes')}
            options={channelOptions}
          />
          <FieldError message={errors.channel_codes} />
        </div>
      </div>
      {/* Quick range shortcuts */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">Quick:</span>
        {QUICK_RANGES.map(({ label, minutes }) => (
          <button
            key={label}
            type="button"
            onClick={() => applyQuickRange(minutes)}
            disabled={!range.start_date || !range.start_time}
            className="cursor-pointer rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Result Table ─────────────────────────────────────────────────────────────

const RESULT_COLUMNS: Array<{
  key: keyof RevenueReportRangeRow
  label: string
  className?: string
}> = [
  { key: 'range_label', label: 'Range', className: 'min-w-[180px]' },
  { key: 'channel_code', label: 'Channel Code', className: 'min-w-[110px]' },
  { key: 'channel_name', label: 'Channel Name', className: 'min-w-[180px]' },
  { key: 'revenue_start', label: 'Revenue Start', className: 'text-right' },
  { key: 'revenue_end', label: 'Revenue End', className: 'text-right' },
  { key: 'real_revenue', label: 'Real Revenue', className: 'text-right' },
  { key: 'conversion_start', label: 'Conv. Start', className: 'text-right' },
  { key: 'conversion_end', label: 'Conv. End', className: 'text-right' },
  { key: 'real_conversion', label: 'Real Conv.', className: 'text-right' },
  { key: 'real_rpc', label: 'Real RPC', className: 'text-right' },
  { key: 'cpc', label: 'CPC', className: 'text-right' },
]

function formatMetric(value: string | number | null): string {
  if (value == null) return '—'
  if (typeof value === 'number')
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return value
}

function parseRangeLabel(label: string): { from: string; to: string } | null {
  const separators = ['->', '→', ' to ', ' - ']
  for (const sep of separators) {
    if (!label.includes(sep)) continue
    const [from, ...rest] = label.split(sep).map((part) => part.trim())
    const to = rest.join(sep).trim()
    if (from && to) return { from, to }
  }
  return null
}

function RangeCell({ value }: { value: string }) {
  const parsed = parseRangeLabel(value)
  if (!parsed) return <span className="text-foreground">{value}</span>

  return (
    <div className="min-w-[220px] space-y-1.5 rounded-md bg-muted/20 px-2.5 py-2">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" />
        <span className="font-medium tracking-wide uppercase">Range</span>
      </div>
      <div className="flex items-center gap-2 text-[12px] leading-tight text-foreground">
        <span className="rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          From
        </span>
        <span className="truncate">{parsed.from}</span>
      </div>
      <div className="flex items-center gap-2 text-[12px] leading-tight text-foreground">
        <span className="rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          To
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/80" />
        <span className="truncate">{parsed.to}</span>
      </div>
    </div>
  )
}

function RangeResultTable({ data, loading }: { data: RevenueReportRangeRow[]; loading: boolean }) {
  return (
    <div className=" rounded-xl border border-border/70 bg-card shadow-sm">
      <div className="overflow-auto">
        <Table className="text-[13px]">
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="h-14 border-border/70 bg-muted/45 hover:bg-muted/45">
              {RESULT_COLUMNS.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    'h-14 whitespace-nowrap bg-transparent text-[12px] font-semibold tracking-[0.08em] text-muted-foreground capitalize',
                    col.className,
                  )}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading && (
              <TableRow className="h-20 border-border/70 hover:bg-transparent">
                <TableCell
                  colSpan={RESULT_COLUMNS.length}
                  className="h-20 whitespace-normal text-center"
                >
                  <div className="inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading report...
                  </div>
                </TableCell>
              </TableRow>
            )}

            {!loading && data.length === 0 && (
              <TableRow className="h-20 border-border/70 hover:bg-transparent">
                <TableCell
                  colSpan={RESULT_COLUMNS.length}
                  className="h-20 whitespace-normal text-center"
                >
                  <p className="text-muted-foreground">No rows yet. Fill ranges and run Search.</p>
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              data.map((row, rowIndex) => (
                <TableRow
                  key={`${row.range_label}-${row.channel_code}-${rowIndex}`}
                  className="h-14 border-border/70 bg-background hover:bg-muted/20"
                >
                  {RESULT_COLUMNS.map((col) => {
                    const value = row[col.key]
                    if (col.key === 'channel_code') {
                      return (
                        <TableCell
                          key={col.key}
                          className={cn('font-mono text-[12px]', col.className)}
                        >
                          <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-1">
                            {value || '—'}
                          </span>
                        </TableCell>
                      )
                    }
                    if (col.key === 'range_label') {
                      return (
                        <TableCell
                          key={col.key}
                          className={cn(
                            'font-semibold whitespace-normal text-foreground',
                            col.className,
                          )}
                        >
                          <RangeCell value={String(value ?? '—')} />
                        </TableCell>
                      )
                    }
                    return (
                      <TableCell
                        key={col.key}
                        className={cn('tabular-nums text-muted-foreground/95', col.className)}
                      >
                        {formatMetric(value)}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

type RangeState = RevenueReportRangeItem & { _id: string }

function validateAll(ranges: RangeState[]): Record<string, RangeErrors> {
  const result: Record<string, RangeErrors> = {}
  for (const r of ranges) {
    const errs: RangeErrors = {}
    if (!r.start_date) errs.start_date = 'Required'
    if (!r.start_time) errs.start_time = 'Required'
    if (!r.end_date) errs.end_date = 'Required'
    if (!r.end_time) errs.end_time = 'Required'
    if (r.channel_codes.length === 0) errs.channel_codes = 'Required'
    if (Object.keys(errs).length > 0) result[r._id] = errs
  }
  return result
}

type RevenueReportRangeDialogProps = {
  trigger?: React.ReactNode
  initialDate?: string
  initialDateFrom?: string | null
  initialDateTo?: string | null
  initialChannelCodes?: string[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function RevenueReportRangeDialog({
  trigger,
  initialDate,
  initialDateFrom,
  initialDateTo,
  initialChannelCodes,
  open: controlledOpen,
  onOpenChange,
}: RevenueReportRangeDialogProps) {
  const makeInitialRange = useCallback(
    (): RangeState => ({
      _id: crypto.randomUUID(),
      start_date: initialDateFrom ?? initialDate ?? '',
      start_time: '00:00',
      end_date: initialDateTo ?? initialDate ?? '',
      end_time: '',
      channel_codes: initialChannelCodes ?? [],
    }),
    [initialDate, initialDateFrom, initialDateTo, initialChannelCodes],
  )

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = typeof controlledOpen === 'boolean'
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const [ranges, setRanges] = useState<RangeState[]>(() => [makeInitialRange()])
  const [fieldErrors, setFieldErrors] = useState<Record<string, RangeErrors>>({})
  const [channelOptions, setChannelOptions] = useState<ChannelOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<RevenueReportRangeRow[]>([])
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (!open) return
    if (fetchedRef.current) return
    fetchedRef.current = true
    campaignReportApi
      .filters()
      .then((res) => setChannelOptions(res.data.data.channels))
      .catch(() => {
        toast.error('Failed to fetch channel options')
      })
  }, [open])

  function updateRange(id: string, patch: Partial<RangeState>, clearField?: keyof RangeErrors) {
    setRanges((prev) => prev.map((r) => (r._id === id ? { ...r, ...patch } : r)))
    setFieldErrors((prev) => {
      if (!prev[id]) return prev
      const next = { ...prev[id] }
      let changed = false
      for (const key of Object.keys(patch) as (keyof RangeErrors)[]) {
        if (key in next) {
          delete next[key]
          changed = true
        }
      }
      if (clearField && clearField in next) {
        delete next[clearField]
        changed = true
      }
      return changed ? { ...prev, [id]: next } : prev
    })
  }

  function removeRange(id: string) {
    setRanges((prev) => prev.filter((r) => r._id !== id))
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function addRange() {
    setRanges((prev) => [...prev, makeInitialRange()])
  }

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next)
      onOpenChange?.(next)
      if (!next) {
        setRanges([makeInitialRange()])
        setFieldErrors({})
        setResults([])
      }
    },
    [isControlled, makeInitialRange, onOpenChange],
  )

  function handleReset() {
    setRanges([makeInitialRange()])
    setFieldErrors({})
    setResults([])
  }

  async function handleSubmit() {
    const errors = validateAll(ranges)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSubmitting(true)
    try {
      const res = await campaignReportApi.queryRange({
        ranges: ranges.map(({ ...r }) => r),
      })
      const data = (res.data as { data: RevenueReportRangeRow[] }).data
      setResults(data)
    } catch {
      toast.error('Failed to submit query')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button size="sm">Revenue Report Range</Button>
        </DialogTrigger>
      ) : null}
      <DialogContent
        className="flex h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-none flex-col gap-0 p-0 sm:h-[95vh] sm:w-[95vw] sm:max-w-[95vw]"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <CalendarRange className="h-3.5 w-3.5 text-primary" />
              </div>
              <DialogTitle>Revenue Report Range</DialogTitle>
            </div>

            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
            <span>Filters</span>
            <Button
              disabled={submitting}
              onClick={handleReset}
              size="sm"
              className="w-full sm:w-20"
            >
              Reset
            </Button>
          </div>
          {ranges.map((range, index) => (
            <RangeRow
              key={range._id}
              index={index}
              range={range}
              channelOptions={channelOptions}
              errors={fieldErrors[range._id] ?? {}}
              onChange={(patch, clearField) => updateRange(range._id, patch, clearField)}
              onRemove={() => removeRange(range._id)}
              canRemove={ranges.length > 1}
            />
          ))}
          <Button
            type="button"
            size="sm"
            className="mx-auto mt-1 w-full max-w-xs gap-2 border-dashed sm:w-auto"
            onClick={addRange}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Range
          </Button>
          <div className="my-2 flex flex-wrap gap-2">
            <Button
              className="w-full sm:w-20"
              type="button"
              size="sm"
              disabled={submitting}
              onClick={() => void handleSubmit()}
            >
              Search
            </Button>
          </div>
          <RangeResultTable loading={submitting} data={results} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

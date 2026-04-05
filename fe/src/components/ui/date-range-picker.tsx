import dayjs from 'dayjs'
import { CalendarIcon, X } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type DateRangePickerProps = {
  /** ISO date string YYYY-MM-DD or null */
  from: string | null
  to: string | null
  onChange: (from: string | null, to: string | null) => void
  placeholder?: string
  className?: string
}

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = 'Select date range',
  className,
}: DateRangePickerProps) {
  const selected: DateRange = {
    from: from ? dayjs(from).toDate() : undefined,
    to: to ? dayjs(to).toDate() : undefined,
  }

  const hasValue = from != null || to != null

  function label() {
    if (from && to) return `${dayjs(from).format('DD/MM/YYYY')} → ${dayjs(to).format('DD/MM/YYYY')}`
    if (from) return `${dayjs(from).format('DD/MM/YYYY')} →`
    if (to) return `→ ${dayjs(to).format('DD/MM/YYYY')}`
    return null
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-8 justify-start gap-1.5 px-2.5 text-xs font-normal',
            !hasValue && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          {label() ?? placeholder}
          {hasValue ? (
            <span
              role="button"
              aria-label="Clear date range"
              onClick={(e) => {
                e.stopPropagation()
                onChange(null, null)
              }}
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={(range) => {
            onChange(
              range?.from ? dayjs(range.from).format('YYYY-MM-DD') : null,
              range?.to ? dayjs(range.to).format('YYYY-MM-DD') : null,
            )
          }}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}

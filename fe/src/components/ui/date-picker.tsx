import dayjs from 'dayjs'
import { CalendarIcon, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type DatePickerProps = {
  /** ISO date string YYYY-MM-DD or null */
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
}: DatePickerProps) {
  const selected = value ? dayjs(value).toDate() : undefined

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-8 justify-start gap-1.5 px-2.5 text-xs font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          {selected ? dayjs(selected).format('DD/MM/YYYY') : placeholder}
          {value ? (
            <span
              role="button"
              aria-label="Clear date"
              onClick={(e) => {
                e.stopPropagation()
                onChange(null)
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
          mode="single"
          selected={selected}
          onSelect={(date) => onChange(date ? dayjs(date).format('YYYY-MM-DD') : null)}
        />
      </PopoverContent>
    </Popover>
  )
}

import { useState } from 'react'
import dayjs from '@/lib/dayjs'
import { CalendarIcon, X } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useMobile'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Drawer, DrawerContent, DrawerTrigger, DrawerClose } from '@/components/ui/drawer'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export type DateRangeValue = { from: string | null; to: string | null }

type Preset = { label: string; getValue: () => DateRangeValue }

const PRESETS: Preset[] = [
  {
    label: 'Today',
    getValue: () => {
      const d = dayjs().format('YYYY-MM-DD')
      return { from: d, to: d }
    },
  },
  {
    label: 'Yesterday',
    getValue: () => {
      const d = dayjs().subtract(1, 'day').format('YYYY-MM-DD')
      return { from: d, to: d }
    },
  },
  {
    label: 'Last 7 Days',
    getValue: () => ({
      from: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
      to: dayjs().format('YYYY-MM-DD'),
    }),
  },
  {
    label: 'Last 30 Days',
    getValue: () => ({
      from: dayjs().subtract(29, 'day').format('YYYY-MM-DD'),
      to: dayjs().format('YYYY-MM-DD'),
    }),
  },
  {
    label: 'This Month',
    getValue: () => ({
      from: dayjs().startOf('month').format('YYYY-MM-DD'),
      to: dayjs().endOf('month').format('YYYY-MM-DD'),
    }),
  },
  {
    label: 'Last Month',
    getValue: () => {
      const m = dayjs().subtract(1, 'month')
      return {
        from: m.startOf('month').format('YYYY-MM-DD'),
        to: m.endOf('month').format('YYYY-MM-DD'),
      }
    },
  },
  {
    label: 'This Year',
    getValue: () => ({
      from: dayjs().startOf('year').format('YYYY-MM-DD'),
      to: dayjs().endOf('year').format('YYYY-MM-DD'),
    }),
  },
  {
    label: 'Last Year',
    getValue: () => {
      const y = dayjs().subtract(1, 'year')
      return {
        from: y.startOf('year').format('YYYY-MM-DD'),
        to: y.endOf('year').format('YYYY-MM-DD'),
      }
    },
  },
  { label: 'Custom', getValue: () => ({ from: null, to: null }) },
]

export type DateRangePickerPresetsProps = {
  from: string | null
  to: string | null
  onChange: (from: string | null, to: string | null) => void
  placeholder?: string
  className?: string
}

export function DateRangePickerPresets({
  from,
  to,
  onChange,
  placeholder = 'Select date range',
  className,
}: DateRangePickerPresetsProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange>({ from: undefined, to: undefined })
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const hasValue = from != null || to != null

  function triggerLabel() {
    if (from && to) return `${dayjs(from).format('DD/MM/YYYY')} - ${dayjs(to).format('DD/MM/YYYY')}`
    if (from) return `${dayjs(from).format('DD/MM/YYYY')} →`
    if (to) return `→ ${dayjs(to).format('DD/MM/YYYY')}`
    return null
  }

  function handleOpenChange(isOpen: boolean) {
    if (isOpen) {
      setDraft({
        from: from ? dayjs(from).toDate() : undefined,
        to: to ? dayjs(to).toDate() : undefined,
      })
      setActivePreset(null)
    }
    setOpen(isOpen)
  }

  function handlePresetDesktop(preset: Preset) {
    if (preset.label === 'Custom') {
      setActivePreset('Custom')
      return
    }
    const val = preset.getValue()
    setDraft({
      from: val.from ? dayjs(val.from).toDate() : undefined,
      to: val.to ? dayjs(val.to).toDate() : undefined,
    })
    setActivePreset(preset.label)
  }

  function handlePresetMobile(preset: Preset) {
    if (preset.label === 'Custom') {
      setActivePreset('Custom')
      setDraft({ from: undefined, to: undefined })
      return
    }
    const val = preset.getValue()
    setDraft({
      from: val.from ? dayjs(val.from).toDate() : undefined,
      to: val.to ? dayjs(val.to).toDate() : undefined,
    })
    setActivePreset(preset.label)
  }

  function handleApply() {
    onChange(
      draft.from ? dayjs(draft.from).format('YYYY-MM-DD') : null,
      draft.to ? dayjs(draft.to).format('YYYY-MM-DD') : null,
    )
    setOpen(false)
  }

  const draftLabel = (() => {
    if (draft.from && draft.to)
      return `${dayjs(draft.from).format('DD/MM/YYYY')} - ${dayjs(draft.to).format('DD/MM/YYYY')}`
    if (draft.from) return dayjs(draft.from).format('DD/MM/YYYY')
    if (draft.to) return `→ ${dayjs(draft.to).format('DD/MM/YYYY')}`
    return ''
  })()

  const triggerButton = (
    <Button
      variant="outline"
      className={cn(
        'h-8 w-full justify-start gap-1.5 px-2.5 text-xs font-normal',
        !hasValue && 'text-muted-foreground',
        className,
      )}
    >
      <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 truncate text-left">{triggerLabel() ?? placeholder}</span>
      {hasValue ? (
        <span
          role="button"
          aria-label="Clear date range"
          onClick={(e) => {
            e.stopPropagation()
            onChange(null, null)
          }}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </span>
      ) : null}
    </Button>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent className="max-h-[92vh]">
          {/* fix: flex-1 so children can use overflow correctly */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Presets — gradient fade indicates scrollability */}
            <div className="relative shrink-0 border-b">
              <div className="flex overflow-x-auto no-scrollbar px-3 py-2.5 gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePresetMobile(preset)}
                    className={cn(
                      'shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors whitespace-nowrap',
                      activePreset === preset.label
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground active:bg-muted',
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {/* Right fade hint */}
              <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-linear-to-l from-popover to-transparent" />
            </div>

            {/* Calendar — bigger touch targets on mobile, scrollable for small phones */}
            <div className="flex-1 min-h-0 overflow-y-auto flex justify-center py-3">
              <Calendar
                mode="range"
                selected={draft}
                onSelect={(range) => {
                  setDraft(range ?? { from: undefined, to: undefined })
                  setActivePreset('Custom')
                }}
                numberOfMonths={1}
                className="[--cell-size:--spacing(10)]"
              />
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t px-4 py-3 flex items-center justify-between gap-3">
              <span className="font-mono text-sm text-muted-foreground truncate">
                {draftLabel || 'Select dates'}
              </span>
              <div className="flex gap-2 shrink-0">
                <DrawerClose asChild>
                  <Button type="button" variant="outline" size="sm" className="h-9 px-4 text-sm">
                    Cancel
                  </Button>
                </DrawerClose>
                <Button type="button" size="sm" className="h-9 px-4 text-sm" onClick={handleApply}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Presets sidebar */}
          <div className="flex w-36 flex-col border-r py-1">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetDesktop(preset)}
                className={cn(
                  'px-4 py-2 text-left text-sm transition-colors hover:bg-muted',
                  activePreset === preset.label
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {/* Calendar */}
          <div className="flex flex-col">
            <Calendar
              mode="range"
              selected={draft}
              onSelect={(range) => {
                setDraft(range ?? { from: undefined, to: undefined })
                setActivePreset('Custom')
              }}
              numberOfMonths={2}
            />
            {/* Bottom bar */}
            <div className="flex items-center justify-between border-t px-4 py-2">
              <span className="font-mono text-xs text-muted-foreground">{draftLabel}</span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="button" size="sm" className="h-7 text-xs" onClick={handleApply}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

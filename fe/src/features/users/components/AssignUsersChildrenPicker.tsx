import { memo, useMemo, useState, type MouseEvent } from 'react'
import { ChevronDown, X } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type AssignChildOption = {
  id: number
  name: string
  email: string
}

type AssignUsersChildrenPickerProps = {
  disabled?: boolean
  value: number[]
  onChange: (next: number[]) => void
  options: AssignChildOption[]
  className?: string
}

const tagClass =
  'inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-white shadow-sm ' +
  'bg-[#4a2323] dark:bg-[#4a2323]'

function AssignUsersChildrenPickerInner({
  disabled,
  value,
  onChange,
  options,
  className,
}: AssignUsersChildrenPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const optionById = useMemo(() => new Map(options.map((o) => [o.id, o])), [options])

  const filtered = useMemo(() => {
    if (!q) {
      return options
    }
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        String(o.id).includes(q),
    )
  }, [options, q])

  const toggle = (id: number) => {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id))
    } else {
      onChange([...value, id])
    }
  }

  const remove = (id: number) => {
    onChange(value.filter((x) => x !== id))
  }

  const onFieldSurfaceClick = (e: MouseEvent) => {
    if (disabled) {
      return
    }
    if ((e.target as HTMLElement).closest('[data-tag-remove]')) {
      return
    }
    setOpen((o) => !o)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          'flex min-h-11 w-full items-stretch rounded-lg border border-input bg-background shadow-xs transition-[color,box-shadow]',
          'dark:border-white/10 dark:bg-black/20',
          'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
          disabled && 'pointer-events-none opacity-50',
          className,
        )}
      >
        <div
          className="flex min-w-0 flex-1 cursor-pointer flex-wrap content-center gap-1.5 px-2 py-1.5"
          onClick={onFieldSurfaceClick}
        >
          {value.length === 0 ? (
            <span className="select-none text-muted-foreground">Select an option</span>
          ) : (
            value.map((id) => {
              const opt = optionById.get(id)
              const label = opt?.email ?? `#${id}`
              return (
                <span key={id} className={tagClass}>
                  <span
                    className="min-w-0 truncate"
                    title={opt ? `${opt.name} · ${opt.email}` : label}
                  >
                    {label}
                  </span>
                  {!disabled ? (
                    <button
                      type="button"
                      data-tag-remove
                      className="shrink-0 rounded p-0.5 opacity-90 hover:bg-white/15 hover:opacity-100"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        remove(id)
                      }}
                      aria-label={`Remove ${label}`}
                    >
                      <X className="size-3" strokeWidth={2.5} />
                    </button>
                  ) : null}
                </span>
              )
            })
          )}
        </div>
        <DropdownMenuTrigger asChild disabled={disabled}>
          <button
            type="button"
            className="flex shrink-0 items-center justify-center border-input border-l px-2.5 text-muted-foreground transition-colors hover:bg-muted/50 dark:border-white/10"
            aria-label="Open child user list"
          >
            <ChevronDown className="size-4" />
          </button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent
        className="w-[min(100vw-2rem,22rem)] p-0"
        align="end"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b p-2">
          <Input
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8"
            autoComplete="off"
          />
        </div>
        <div className="max-h-56 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-muted-foreground text-sm">No matches</p>
          ) : (
            filtered.map((opt) => (
              <DropdownMenuCheckboxItem
                key={opt.id}
                className="flex-col items-start gap-0.5 py-2"
                checked={value.includes(opt.id)}
                onCheckedChange={() => toggle(opt.id)}
                onSelect={(e) => e.preventDefault()}
              >
                <span className="w-full truncate font-medium">{opt.name}</span>
                <span className="w-full truncate text-muted-foreground text-xs">{opt.email}</span>
              </DropdownMenuCheckboxItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const AssignUsersChildrenPicker = memo(AssignUsersChildrenPickerInner)

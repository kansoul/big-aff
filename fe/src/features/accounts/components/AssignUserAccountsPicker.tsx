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

export type AssignAccountOption = {
  id: number
  account_id: string
  account_name: string | null
}

type AssignUserAccountsPickerProps = {
  disabled?: boolean
  value: number[]
  onChange: (next: number[]) => void
  options: AssignAccountOption[]
  className?: string
  placeholder?: string
  tagClassName?: string
}

function formatOptionLabel(option: AssignAccountOption): string {
  const accountName = option.account_name?.trim()
  if (!accountName) {
    return option.account_id
  }
  return `${accountName} (${option.account_id})`
}

function AssignUserAccountsPickerInner({
  disabled,
  value,
  onChange,
  options,
  className,
  placeholder = 'Select accounts…',
  tagClassName = 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400',
}: AssignUserAccountsPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const optionById = useMemo(() => new Map(options.map((o) => [o.id, o])), [options])

  const filtered = useMemo(() => {
    if (!q) return options
    return options.filter((o) => {
      const accountName = o.account_name ?? ''
      return (
        accountName.toLowerCase().includes(q) ||
        o.account_id.toLowerCase().includes(q) ||
        String(o.id).includes(q)
      )
    })
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
    if (disabled) return
    if ((e.target as HTMLElement).closest('[data-tag-remove]')) return
    setOpen((o) => !o)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          'flex min-h-11 w-full items-stretch rounded-lg border border-input bg-background shadow-xs transition-[color,box-shadow]',
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
            <span className="select-none text-sm text-muted-foreground">{placeholder}</span>
          ) : (
            value.map((id) => {
              const option = optionById.get(id)
              const label = option ? formatOptionLabel(option) : `#${id}`
              return (
                <span
                  key={id}
                  className={cn(
                    'inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium shadow-sm',
                    tagClassName,
                  )}
                >
                  <span className="min-w-0 truncate" title={label}>
                    {label}
                  </span>
                  {!disabled ? (
                    <button
                      type="button"
                      data-tag-remove
                      className="shrink-0 rounded p-1 opacity-80 hover:bg-red-200/60 hover:opacity-100 dark:hover:bg-red-900/40"
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
            className="flex shrink-0 items-center justify-center border-l border-input px-2.5 text-muted-foreground transition-colors hover:bg-muted/50"
            aria-label="Open account list"
          >
            <ChevronDown className="size-4" />
          </button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent
        className="w-[min(100vw-2rem,32rem)] p-0"
        align="end"
        collisionPadding={16}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b p-2">
          <Input
            placeholder="Search by account id or name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8"
            autoComplete="off"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">No matches</p>
          ) : (
            filtered.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.id}
                className="flex-col items-start gap-0.5 py-2"
                checked={value.includes(option.id)}
                onCheckedChange={() => toggle(option.id)}
                onSelect={(e) => e.preventDefault()}
              >
                <span className="w-full truncate font-medium">{option.account_id}</span>
                <span className="w-full truncate text-xs text-muted-foreground">
                  {option.account_name || '—'}
                </span>
              </DropdownMenuCheckboxItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const AssignUserAccountsPicker = memo(AssignUserAccountsPickerInner)

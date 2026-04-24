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

export type AssignPostOption = {
  id: number
  title: string
}

type AssignUserPostsPickerProps = {
  disabled?: boolean
  value: number[]
  onChange: (next: number[]) => void
  options: AssignPostOption[]
  className?: string
  placeholder?: string
}

function AssignUserPostsPickerInner({
  disabled,
  value,
  onChange,
  options,
  className,
  placeholder = 'Select posts…',
}: AssignUserPostsPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const optionById = useMemo(() => new Map(options.map((o) => [o.id, o])), [options])

  const filtered = useMemo(() => {
    if (!q) return options
    return options.filter(
      (o) => o.title.toLowerCase().includes(q) || String(o.id).includes(q),
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
              const label = option ? option.title : `#${id}`
              return (
                <span
                  key={id}
                  className="inline-flex max-w-full items-center gap-1 rounded-md bg-blue-100 px-2 py-1.5 text-xs font-medium text-blue-800 shadow-sm dark:bg-blue-950/40 dark:text-blue-400"
                >
                  <span className="min-w-0 truncate" title={label}>
                    {label}
                  </span>
                  {!disabled ? (
                    <button
                      type="button"
                      data-tag-remove
                      className="shrink-0 rounded p-1 opacity-80 hover:bg-blue-200/60 hover:opacity-100 dark:hover:bg-blue-900/40"
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
            aria-label="Open post list"
          >
            <ChevronDown className="size-4" />
          </button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent
        className="w-[min(100vw-2rem,36rem)] p-0"
        align="end"
        collisionPadding={16}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b p-2">
          <Input
            placeholder="Search by title or ID…"
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
                className="gap-2 py-2"
                checked={value.includes(option.id)}
                onCheckedChange={() => toggle(option.id)}
                onSelect={(e) => e.preventDefault()}
              >
                <span className="min-w-0 flex-1 truncate font-medium">{option.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">#{option.id}</span>
              </DropdownMenuCheckboxItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const AssignUserPostsPicker = memo(AssignUserPostsPickerInner)

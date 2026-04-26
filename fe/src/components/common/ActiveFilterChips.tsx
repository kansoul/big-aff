import { X } from 'lucide-react'

export type ActiveFilterChip = {
  key: string
  label: string
  displayValue: string
}

type ActiveFilterChipsProps = {
  chips: ActiveFilterChip[]
  onRemove: (key: string) => void
  onClearAll?: () => void
}

export function ActiveFilterChips({ chips, onRemove, onClearAll }: ActiveFilterChipsProps) {
  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 bg-muted/30 px-4 py-2">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        Filtered by:
      </span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium text-foreground shadow-sm"
        >
          <span className="text-muted-foreground">{chip.label}:</span>
          <span className="max-w-35 truncate">{chip.displayValue}</span>
          <button
            type="button"
            aria-label={`Remove ${chip.label} filter`}
            onClick={() => onRemove(chip.key)}
            className="ml-0.5 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      {chips.length > 1 && onClearAll ? (
        <button
          type="button"
          onClick={onClearAll}
          className="text-[11px] font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          Clear all
        </button>
      ) : null}
    </div>
  )
}

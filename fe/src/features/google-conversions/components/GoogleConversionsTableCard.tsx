import { memo } from 'react'
import { ChevronLeft, ChevronRight, FileUp, Loader2, RefreshCw, Repeat, Save } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type {
  ConversionField,
  GoogleConversion,
  GoogleConversionDraftMap,
  GoogleConversionFilterParams,
} from '@/features/google-conversions/types'

const CONVERSION_COLUMNS: Array<{ field: ConversionField; header: string }> = [
  { field: 'article_view', header: 'Article View' },
  { field: 'rsu_click', header: 'RSU Click' },
  { field: 'search_view', header: 'Search View' },
  { field: 'search_click', header: 'Search Click' },
]

// ─── Row card ────────────────────────────────────────────────────────────────

type ConversionRowProps = {
  conversion: GoogleConversion
  draft: GoogleConversionDraftMap[number] | undefined
  isDirty: boolean
  canUpdate: boolean
  saving: boolean
  onDraftChange: (id: number, field: ConversionField, value: string) => void
}

const ConversionRow = memo(function ConversionRow({
  conversion,
  draft,
  isDirty,
  canUpdate,
  saving,
  onDraftChange,
}: ConversionRowProps) {
  return (
    <Card className={cn('transition-colors', isDirty ? 'border-primary/40' : 'border-border')}>
      <CardContent className="pt-4 pb-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          {/* Account — read-only */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Account</p>
            <Input
              value={conversion.account_name}
              readOnly
              disabled
              className="h-9 cursor-default bg-muted/40 text-sm font-medium"
            />
          </div>

          {/* Editable conversion ID fields */}
          {CONVERSION_COLUMNS.map(({ field, header }) => {
            const value = draft?.[field] ?? conversion.conversion?.[field] ?? ''
            return (
              <div key={field} className="space-y-1.5">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                  {header}
                </p>
                <Input
                  value={value}
                  placeholder="Conversion ID"
                  disabled={!canUpdate || saving}
                  className="h-9 font-mono text-sm"
                  onChange={(e) => onDraftChange(conversion.id, field, e.target.value)}
                />
              </div>
            )
          })}
        </div>

        {isDirty ? (
          <p className="mt-2 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            Unsaved changes
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
})

// ─── Main component ───────────────────────────────────────────────────────────

type GoogleConversionsTableCardProps = {
  conversions: GoogleConversion[]
  loading: boolean
  saving: boolean
  rowCount: number
  filters: GoogleConversionFilterParams
  drafts: GoogleConversionDraftMap
  dirtyCount: number
  canUpdate: boolean
  canCreate: boolean
  onFilterChange: (patch: Partial<GoogleConversionFilterParams>) => void
  onDraftChange: (id: number, field: ConversionField, value: string) => void
  onSaveChanges: () => void
  onImportClick: () => void
  onReload: () => void
}

function isDirtyRow(
  conversion: GoogleConversion,
  draft: GoogleConversionDraftMap[number] | undefined,
): boolean {
  if (!draft) return false
  return CONVERSION_COLUMNS.some(({ field }) => {
    const draftVal = draft[field]
    if (draftVal === undefined) return false
    return draftVal !== (conversion.conversion?.[field] ?? '')
  })
}

export function GoogleConversionsTableCard({
  conversions,
  loading,
  saving,
  rowCount,
  filters,
  drafts,
  dirtyCount,
  canUpdate,
  canCreate,
  onFilterChange,
  onDraftChange,
  onSaveChanges,
  onImportClick,
  onReload,
}: GoogleConversionsTableCardProps) {
  const page = filters.page ?? 1
  const perPage = filters.per_page ?? 15
  const totalPages = Math.max(1, Math.ceil(rowCount / perPage))
  const showEmpty = !loading && conversions.length === 0

  return (
    <section className="space-y-4">
      {/* Toolbar */}
      <p className="text-xs text-muted-foreground">
        {rowCount} record{rowCount === 1 ? '' : 's'}
      </p>
      <div className="flex flex-wrap justify-end items-center gap-2">
        {canUpdate ? (
          <Button
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide"
            disabled={saving || dirtyCount === 0}
            onClick={onSaveChanges}
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                Save Changes{dirtyCount > 0 ? ` (${dirtyCount})` : ''}
              </>
            )}
          </Button>
        ) : null}
        <Button
          size="sm"
          className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide"
          disabled={loading}
          onClick={onReload}
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          Reload
        </Button>
        {canCreate ? (
          <Button
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide"
            onClick={onImportClick}
          >
            <FileUp className="size-3.5" />
            Import Bulk
          </Button>
        ) : null}
      </div>

      {/* Rows */}
      <div className={cn('space-y-3', loading && 'pointer-events-none opacity-60')}>
        {conversions.map((item) => (
          <ConversionRow
            key={item.id}
            conversion={item}
            draft={drafts[item.id]}
            isDirty={isDirtyRow(item, drafts[item.id])}
            canUpdate={canUpdate}
            saving={saving}
            onDraftChange={onDraftChange}
          />
        ))}
      </div>

      {showEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <Repeat className="size-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No conversion records found.</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Pagination */}
      <Card>
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page} / {totalPages}
          </p>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              disabled={loading || page <= 1}
              onClick={() => onFilterChange({ page: page - 1 })}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              disabled={loading || page >= totalPages}
              onClick={() => onFilterChange({ page: page + 1 })}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

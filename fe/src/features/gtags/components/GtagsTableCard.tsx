import { memo } from 'react'
import { ChevronLeft, ChevronRight, FileUp, Loader2, RefreshCw, Save, Tag } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Gtag, GtagDraftMap, GtagField, GtagFilterParams } from '@/features/gtags/types'

const GTAG_COLUMNS: Array<{ field: GtagField; header: string }> = [
  { field: 'code', header: 'Code (AW-…)' },
  { field: 'article_view', header: 'Article View' },
  { field: 'rsu_click', header: 'RSU Click' },
  { field: 'search_view', header: 'Search View' },
  { field: 'search_click', header: 'Search Click' },
]

// ─── Row card ────────────────────────────────────────────────────────────────

type GtagRowProps = {
  gtag: Gtag
  draft: GtagDraftMap[number] | undefined
  isDirty: boolean
  canUpdate: boolean
  saving: boolean
  onDraftChange: (id: number, field: GtagField, value: string) => void
}

const GtagRow = memo(function GtagRow({
  gtag,
  draft,
  isDirty,
  canUpdate,
  saving,
  onDraftChange,
}: GtagRowProps) {
  return (
    <Card className={cn('transition-colors', isDirty ? 'border-primary/40' : 'border-border')}>
      <CardContent className="pt-4 pb-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]">
          {/* Account — read-only */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Account</p>
            <Input
              value={gtag.account_name}
              readOnly
              disabled
              className="h-9 cursor-default bg-muted/40 text-sm font-medium"
            />
          </div>

          {/* Editable gtag fields */}
          {GTAG_COLUMNS.map(({ field, header }) => {
            const value = draft?.[field] ?? gtag.gtag?.[field] ?? ''
            return (
              <div key={field} className="space-y-1.5">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                  {header}
                </p>
                <Input
                  value={value}
                  placeholder={field === 'code' ? 'AW-…' : 'Conversion ID'}
                  disabled={!canUpdate || saving}
                  className="h-9 font-mono text-sm"
                  onChange={(e) => onDraftChange(gtag.id, field, e.target.value)}
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

type GtagsTableCardProps = {
  gtags: Gtag[]
  loading: boolean
  saving: boolean
  rowCount: number
  filters: GtagFilterParams
  drafts: GtagDraftMap
  dirtyCount: number
  canUpdate: boolean
  canCreate: boolean
  onFilterChange: (patch: Partial<GtagFilterParams>) => void
  onDraftChange: (id: number, field: GtagField, value: string) => void
  onSaveChanges: () => void
  onImportClick: () => void
  onReload: () => void
}

function isDirtyRow(gtag: Gtag, draft: GtagDraftMap[number] | undefined): boolean {
  if (!draft) return false
  return GTAG_COLUMNS.some(({ field }) => {
    const draftVal = draft[field]
    if (draftVal === undefined) return false
    return draftVal !== (gtag.gtag?.[field] ?? '')
  })
}

export function GtagsTableCard({
  gtags,
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
}: GtagsTableCardProps) {
  const page = filters.page ?? 1
  const perPage = filters.per_page ?? 15
  const totalPages = Math.max(1, Math.ceil(rowCount / perPage))
  const showEmpty = !loading && gtags.length === 0

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
        {gtags.map((item) => (
          <GtagRow
            key={item.id}
            gtag={item}
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
            <Tag className="size-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No gtag records found.</p>
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

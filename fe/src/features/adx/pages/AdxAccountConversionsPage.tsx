import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { FileUp, Loader2, RefreshCw, Repeat, Save } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { Input } from '@/components/ui/input'
import { adxApi } from '@/features/adx/api'
import {
  AdxAccountConversionDialog,
  AdxAccountConversionImportDialog,
} from '@/features/adx/components'
import {
  CONVERSION_TYPE_OPTIONS,
  MonoText,
  PaginationBar,
  SOURCE_OPTIONS,
  StatusPill,
  Toolbar,
} from '@/features/adx/components/AdxShared'
import type {
  AdxAccountConversion,
  AdxAccountConversionFilterParams,
  AdxConversionType,
  PaginationMeta,
} from '@/features/adx/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { formatApiError } from '@/features/settings/components'
import { cn } from '@/lib/utils'

const DEFAULT_PAGE_SIZE = 15

const DEFAULT_FILTERS: AdxAccountConversionFilterParams = {
  page: 1,
  per_page: DEFAULT_PAGE_SIZE,
  source: null,
  account_id: null,
  conversion_type: null,
  status: null,
  order_by: 'id',
  order: 'desc',
}

const SOURCE_OPTIONS_SELECT = SOURCE_OPTIONS.map((s) => ({ value: s, label: s }))
const CONVERSION_TYPE_OPTIONS_SELECT = CONVERSION_TYPE_OPTIONS.map((t) => ({
  value: t,
  label: t.replaceAll('_', ' '),
}))

type ConversionDraftMap = Record<string, Partial<Record<AdxConversionType, string>>>

type AccountConversionRow = {
  key: string
  source: string
  account_id: string
  conversions: Partial<Record<AdxConversionType, AdxAccountConversion>>
}

type AccountConversionCardProps = {
  row: AccountConversionRow
  draft: ConversionDraftMap[string] | undefined
  isDirty: boolean
  canEdit: boolean
  saving: boolean
  onDraftChange: (key: string, field: AdxConversionType, value: string) => void
}

function rowKey(source: string, accountId: string): string {
  return `${source}|${accountId}`
}

function humanConversionType(value: string): string {
  return value.replaceAll('_', ' ')
}

function groupConversions(items: AdxAccountConversion[]): AccountConversionRow[] {
  const rows = new Map<string, AccountConversionRow>()

  for (const item of items) {
    const key = rowKey(item.source, item.account_id)
    const row =
      rows.get(key) ??
      ({
        key,
        source: item.source,
        account_id: item.account_id,
        conversions: {},
      } satisfies AccountConversionRow)

    row.conversions[item.conversion_type] = item
    rows.set(key, row)
  }

  return Array.from(rows.values())
}

function isDirtyRow(
  row: AccountConversionRow,
  draft: ConversionDraftMap[string] | undefined,
): boolean {
  if (!draft) return false

  return CONVERSION_TYPE_OPTIONS.some((type) => {
    const draftValue = draft[type]
    if (draftValue === undefined) return false

    return draftValue.trim() !== (row.conversions[type]?.conversion_action_id ?? '')
  })
}

const AccountConversionCard = memo(function AccountConversionCard({
  row,
  draft,
  isDirty,
  canEdit,
  saving,
  onDraftChange,
}: AccountConversionCardProps) {
  return (
    <Card className={cn('transition-colors', isDirty ? 'border-primary/40' : 'border-border')}>
      <CardContent className="space-y-4 pt-4 pb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.35fr_auto] sm:items-center">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">Account</p>
            <MonoText value={row.account_id} className="block truncate text-sm" />
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <StatusPill value={row.source} />
            {isDirty ? (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                Unsaved changes
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {CONVERSION_TYPE_OPTIONS.map((type) => {
            const conversion = row.conversions[type]
            const value = draft?.[type] ?? conversion?.conversion_action_id ?? ''

            return (
              <div key={type} className="space-y-1.5">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground">
                  {humanConversionType(type)}
                </p>
                <Input
                  value={value}
                  placeholder="Conversion ID"
                  disabled={!canEdit || saving}
                  className="h-9 font-mono text-sm"
                  onChange={(event) => onDraftChange(row.key, type, event.target.value)}
                />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
})

export function AdxAccountConversionsPage() {
  const user = useAuthStore((s) => s.user)
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions])
  const access = useMemo(
    () => ({
      createConversion: hasPermission(permissions, PermissionSlugs.AdxAccountConversionsCreate),
      updateConversion: hasPermission(permissions, PermissionSlugs.AdxAccountConversionsUpdate),
      deleteConversion: hasPermission(permissions, PermissionSlugs.AdxAccountConversionsDelete),
    }),
    [permissions],
  )

  const [items, setItems] = useState<AdxAccountConversion[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<AdxAccountConversionFilterParams>(DEFAULT_FILTERS)
  const [refresh, setRefresh] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [drafts, setDrafts] = useState<ConversionDraftMap>({})
  const reload = useCallback(() => setRefresh((v) => v + 1), [])

  useEffect(() => {
    let ignore = false
    async function run() {
      try {
        setLoading(true)
        const { data } = await adxApi.listAccountConversions(filters)
        if (!ignore) {
          setItems(data.data)
          setPagination(data.pagination)
          setDrafts({})
        }
      } catch (err) {
        if (!ignore) toast.error(formatApiError(err))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    void run()
    return () => {
      ignore = true
    }
  }, [filters, refresh])

  const rows = useMemo(() => groupConversions(items), [items])

  const onDraftChange = useCallback((key: string, field: AdxConversionType, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }))
  }, [])

  const dirtyRows = useMemo(
    () => rows.filter((row) => isDirtyRow(row, drafts[row.key])),
    [drafts, rows],
  )

  const onSaveChanges = useCallback(async () => {
    const operations: Array<() => Promise<unknown>> = []
    let blocked = 0

    for (const row of rows) {
      const draft = drafts[row.key]
      if (!draft) continue

      for (const type of CONVERSION_TYPE_OPTIONS) {
        const draftValue = draft[type]
        if (draftValue === undefined) continue

        const conversion = row.conversions[type]
        const nextValue = draftValue.trim()
        const currentValue = conversion?.conversion_action_id ?? ''
        if (nextValue === currentValue) continue

        if (conversion && nextValue === '') {
          if (!access.deleteConversion) {
            blocked++
            continue
          }
          operations.push(() => adxApi.deleteAccountConversion(conversion.id))
          continue
        }

        if (conversion) {
          if (!access.updateConversion) {
            blocked++
            continue
          }
          operations.push(() =>
            adxApi.updateAccountConversion(conversion.id, {
              conversion_action_id: nextValue,
              name: conversion.name,
              status: conversion.status,
            }),
          )
          continue
        }

        if (nextValue !== '') {
          if (!access.createConversion) {
            blocked++
            continue
          }
          operations.push(() =>
            adxApi.createAccountConversion({
              source: row.source,
              account_id: row.account_id,
              conversion_type: type,
              conversion_action_id: nextValue,
              name: humanConversionType(type),
              status: 'active',
            }),
          )
        }
      }
    }

    if (operations.length === 0) {
      if (blocked > 0) toast.error('You do not have permission to save some changes.')
      return
    }

    try {
      setSaving(true)
      await Promise.all(operations.map((operation) => operation()))
      toast.success(`Saved ${operations.length} change${operations.length === 1 ? '' : 's'}`)
      if (blocked > 0) toast.warning(`${blocked} change${blocked === 1 ? '' : 's'} skipped`)
      reload()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }, [access, drafts, reload, rows])

  const onApplyFilters = useCallback((values: Record<string, unknown>) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      account_id:
        typeof values.account_id === 'string' && values.account_id ? values.account_id : null,
      source: typeof values.source === 'string' ? values.source : null,
      conversion_type: typeof values.conversion_type === 'string' ? values.conversion_type : null,
    }))
  }, [])

  const onResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const onImportClick = useCallback(() => {
    if (!access.createConversion) {
      toast.error('You do not have permission to import conversions.')
      return
    }
    setImportOpen(true)
  }, [access.createConversion])

  const onReload = useCallback(() => {
    if (Object.keys(drafts).length > 0) {
      toast.warning('Unsaved changes were discarded.')
    }
    reload()
  }, [drafts, reload])

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'account_id',
        label: 'Account ID',
        type: 'input',
        value: filters.account_id ?? null,
        placeholder: 'Account ID...',
      },
      {
        field: 'source',
        label: 'Source',
        type: 'select',
        value: filters.source ?? null,
        options: SOURCE_OPTIONS_SELECT,
        placeholder: 'All sources',
      },
      {
        field: 'conversion_type',
        label: 'Conversion Type',
        type: 'select',
        value: filters.conversion_type ?? null,
        options: CONVERSION_TYPE_OPTIONS_SELECT,
        placeholder: 'All types',
      },
    ],
    [filters],
  )

  return (
    <div className="flex flex-col gap-6">
      <FilterPanel
        fields={filterFields}
        onReset={onResetFilters}
        applyMode
        onApply={onApplyFilters}
      />
      <section className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        <Toolbar
          title="Account Conversions"
          subtitle="Google Ads conversion actions mapped per account and funnel event."
          canCreate={access.createConversion}
          createLabel="Create mapping"
          onCreate={() => setDialogOpen(true)}
        >
          {access.updateConversion || access.createConversion || access.deleteConversion ? (
            <Button
              size="sm"
              className="gap-1.5"
              disabled={saving || dirtyRows.length === 0}
              onClick={() => void onSaveChanges()}
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  Save Changes{dirtyRows.length > 0 ? ` (${dirtyRows.length})` : ''}
                </>
              )}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={loading}
            onClick={onReload}
          >
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
            Reload
          </Button>
          {access.createConversion ? (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onImportClick}>
              <FileUp className="size-3.5" />
              Import Bulk
            </Button>
          ) : null}
        </Toolbar>
        <div
          className={cn('space-y-3 p-4', (loading || saving) && 'pointer-events-none opacity-60')}
        >
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading mappings...
              </CardContent>
            </Card>
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
                <Repeat className="size-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No conversion mappings found.</p>
              </CardContent>
            </Card>
          ) : (
            rows.map((row) => (
              <AccountConversionCard
                key={row.key}
                row={row}
                draft={drafts[row.key]}
                isDirty={isDirtyRow(row, drafts[row.key])}
                canEdit={
                  access.createConversion || access.updateConversion || access.deleteConversion
                }
                saving={saving}
                onDraftChange={onDraftChange}
              />
            ))
          )}
        </div>
        <PaginationBar
          pagination={pagination}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          onPageSizeChange={(perPage) =>
            setFilters((prev) => ({ ...prev, page: 1, per_page: perPage }))
          }
        />
      </section>
      <AdxAccountConversionDialog
        open={dialogOpen}
        conversion={null}
        onOpenChange={(open) => {
          setDialogOpen(open)
        }}
        onSuccess={reload}
      />
      {access.createConversion ? (
        <AdxAccountConversionImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onSuccess={reload}
        />
      ) : null}
    </div>
  )
}

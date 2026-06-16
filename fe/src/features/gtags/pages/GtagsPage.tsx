import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { gtagsApi } from '@/features/gtags/api'
import { GtagsTableCard, ImportBulkDialog } from '@/features/gtags/components'
import type {
  Gtag,
  GtagBulkUpdateRow,
  GtagDraftMap,
  GtagField,
  GtagFilterParams,
} from '@/features/gtags/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { formatApiError } from '@/features/settings/components'

const GTAG_FIELDS: GtagField[] = ['code', 'article_view', 'rsu_click', 'search_view', 'search_click']

const DEFAULT_FILTERS: GtagFilterParams = {
  order_by: 'created_at',
  order: 'desc',
  page: 1,
  per_page: 15,
}

export function GtagsPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])
  const canUpdate = useMemo(() => hasPermission(perms, PermissionSlugs.GtagsUpdate), [perms])
  const canCreate = useMemo(() => hasPermission(perms, PermissionSlugs.GtagsCreate), [perms])

  const [gtags, setGtags] = useState<Gtag[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filters, setFilters] = useState<GtagFilterParams>(DEFAULT_FILTERS)
  const [drafts, setDrafts] = useState<GtagDraftMap>({})
  const [importOpen, setImportOpen] = useState(false)

  const loadData = useCallback(async (activeFilters: GtagFilterParams) => {
    try {
      setLoading(true)
      const { data } = await gtagsApi.list(activeFilters)
      setGtags(data.data)
      setRowCount(data.pagination.total)
      setDrafts({})
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData(filters)
  }, [loadData, filters])

  const onFilterChange = useCallback(
    (patch: Partial<GtagFilterParams>) => {
      const hasDirtyDrafts = Object.keys(drafts).length > 0
      if (hasDirtyDrafts) {
        toast.warning('Unsaved changes were discarded.')
      }
      setFilters((prev) => ({ ...prev, ...patch }))
    },
    [drafts],
  )

  const onDraftChange = useCallback((id: number, field: GtagField, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }, [])

  const dirtyCount = useMemo(() => {
    return Object.entries(drafts).filter(([idStr, draft]) => {
      const id = Number(idStr)
      const original = gtags.find((g) => g.id === id)
      if (!original) return false
      return Object.entries(draft).some(
        ([field, value]) => (value ?? '') !== (original.gtag?.[field as GtagField] ?? ''),
      )
    }).length
  }, [drafts, gtags])

  const onSaveChanges = useCallback(async () => {
    const dirtyEntries = Object.entries(drafts).filter(([idStr, draft]) => {
      const id = Number(idStr)
      const original = gtags.find((g) => g.id === id)
      if (!original) return false
      return Object.entries(draft).some(
        ([field, value]) => (value ?? '') !== (original.gtag?.[field as GtagField] ?? ''),
      )
    })

    if (dirtyEntries.length === 0) return

    const rows: GtagBulkUpdateRow[] = dirtyEntries.map(([idStr, draft]) => {
      const id = Number(idStr)
      const original = gtags.find((g) => g.id === id)!
      const saved = original.gtag
      const row: GtagBulkUpdateRow = { account_id: String(original.account_id) }
      for (const field of GTAG_FIELDS) {
        row[field] = draft[field] !== undefined ? draft[field] || null : (saved?.[field] ?? null)
      }
      return row
    })

    try {
      setSaving(true)
      await gtagsApi.bulkUpdate(rows)
      toast.success(`Saved ${rows.length} record${rows.length === 1 ? '' : 's'} successfully`)
      void loadData(filters)
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }, [drafts, gtags, filters, loadData])

  const onImportSuccess = useCallback(() => {
    void loadData(filters)
  }, [loadData, filters])

  const onImportClick = useCallback(() => {
    if (!canCreate) {
      toast.error('You do not have permission to import gtags.')
      return
    }
    setImportOpen(true)
  }, [canCreate])

  return (
    <>
      <GtagsTableCard
        gtags={gtags}
        loading={loading}
        saving={saving}
        rowCount={rowCount}
        filters={filters}
        drafts={drafts}
        dirtyCount={dirtyCount}
        canUpdate={canUpdate}
        canCreate={canCreate}
        onFilterChange={onFilterChange}
        onDraftChange={onDraftChange}
        onSaveChanges={() => void onSaveChanges()}
        onImportClick={onImportClick}
        onReload={() => void loadData(filters)}
      />

      {canCreate ? (
        <ImportBulkDialog open={importOpen} onOpenChange={setImportOpen} onSuccess={onImportSuccess} />
      ) : null}
    </>
  )
}

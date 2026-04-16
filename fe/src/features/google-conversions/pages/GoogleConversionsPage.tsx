import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { googleConversionsApi } from '@/features/google-conversions/api'
import {
  GoogleConversionsTableCard,
  ImportBulkDialog,
} from '@/features/google-conversions/components'
import type {
  ConversionField,
  GoogleConversion,
  GoogleConversionBulkUpdateRow,
  GoogleConversionDraftMap,
  GoogleConversionFilterParams,
} from '@/features/google-conversions/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { formatApiError } from '@/features/settings/components'

const DEFAULT_FILTERS: GoogleConversionFilterParams = {
  order_by: 'created_at',
  order: 'desc',
  page: 1,
  per_page: 15,
}

export function GoogleConversionsPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])
  const canUpdate = useMemo(
    () => hasPermission(perms, PermissionSlugs.GoogleConversionsUpdate),
    [perms],
  )

  const [conversions, setConversions] = useState<GoogleConversion[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filters, setFilters] = useState<GoogleConversionFilterParams>(DEFAULT_FILTERS)
  const [drafts, setDrafts] = useState<GoogleConversionDraftMap>({})
  const [importOpen, setImportOpen] = useState(false)

  const loadData = useCallback(async (activeFilters: GoogleConversionFilterParams) => {
    try {
      setLoading(true)
      const { data } = await googleConversionsApi.list(activeFilters)
      setConversions(data.data)
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
    (patch: Partial<GoogleConversionFilterParams>) => {
      const hasDirtyDrafts = Object.keys(drafts).length > 0
      if (hasDirtyDrafts) {
        toast.warning('Unsaved changes were discarded.')
      }
      setFilters((prev) => ({ ...prev, ...patch }))
    },
    [drafts],
  )

  const onDraftChange = useCallback((id: number, field: ConversionField, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }, [])

  const dirtyCount = useMemo(() => {
    return Object.entries(drafts).filter(([idStr, draft]) => {
      const id = Number(idStr)
      const original = conversions.find((c) => c.id === id)
      if (!original) return false
      return Object.entries(draft).some(
        ([field, value]) =>
          (value ?? '') !== (original.conversion?.[field as ConversionField] ?? ''),
      )
    }).length
  }, [drafts, conversions])

  const onSaveChanges = useCallback(async () => {
    const dirtyEntries = Object.entries(drafts).filter(([idStr, draft]) => {
      const id = Number(idStr)
      const original = conversions.find((c) => c.id === id)
      if (!original) return false
      return Object.entries(draft).some(
        ([field, value]) =>
          (value ?? '') !== (original.conversion?.[field as ConversionField] ?? ''),
      )
    })

    if (dirtyEntries.length === 0) return

    const rows: GoogleConversionBulkUpdateRow[] = dirtyEntries.map(([idStr, draft]) => {
      const id = Number(idStr)
      const original = conversions.find((c) => c.id === id)!
      const saved = original.conversion
      return {
        account_id: Number(original.account_id),
        article_view:
          draft.article_view !== undefined
            ? draft.article_view || null
            : (saved?.article_view ?? null),
        rsu_click:
          draft.rsu_click !== undefined ? draft.rsu_click || null : (saved?.rsu_click ?? null),
        search_view:
          draft.search_view !== undefined
            ? draft.search_view || null
            : (saved?.search_view ?? null),
        search_click:
          draft.search_click !== undefined
            ? draft.search_click || null
            : (saved?.search_click ?? null),
      }
    })

    try {
      setSaving(true)
      await googleConversionsApi.bulkUpdate(rows)
      toast.success(`Saved ${rows.length} record${rows.length === 1 ? '' : 's'} successfully`)
      void loadData(filters)
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setSaving(false)
    }
  }, [drafts, conversions, filters, loadData])

  const onImportSuccess = useCallback(() => {
    void loadData(filters)
  }, [loadData, filters])

  return (
    <>
      <GoogleConversionsTableCard
        conversions={conversions}
        loading={loading}
        saving={saving}
        rowCount={rowCount}
        filters={filters}
        drafts={drafts}
        dirtyCount={dirtyCount}
        canUpdate={canUpdate}
        onFilterChange={onFilterChange}
        onDraftChange={onDraftChange}
        onSaveChanges={() => void onSaveChanges()}
        onImportClick={() => setImportOpen(true)}
        onReload={() => void loadData(filters)}
      />

      <ImportBulkDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={onImportSuccess}
      />
    </>
  )
}

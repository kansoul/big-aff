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
  const canCreate = useMemo(
    () => hasPermission(perms, PermissionSlugs.GoogleConversionsCreate),
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
        account_id: String(original.account_id),
        page_view:
          draft.page_view !== undefined ? draft.page_view || null : (saved?.page_view ?? null),
        redirect: draft.redirect !== undefined ? draft.redirect || null : (saved?.redirect ?? null),
        submit_form:
          draft.submit_form !== undefined
            ? draft.submit_form || null
            : (saved?.submit_form ?? null),
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

  const onImportClick = useCallback(() => {
    if (!canCreate) {
      toast.error('You do not have permission to import conversions.')
      return
    }
    setImportOpen(true)
  }, [canCreate])

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
        canCreate={canCreate}
        onFilterChange={onFilterChange}
        onDraftChange={onDraftChange}
        onSaveChanges={() => void onSaveChanges()}
        onImportClick={onImportClick}
        onReload={() => void loadData(filters)}
      />

      {canCreate ? (
        <ImportBulkDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onSuccess={onImportSuccess}
        />
      ) : null}
    </>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { businessCentersApi } from '@/features/business-centers/api'
import { pixelsApi } from '@/features/pixels/api'
import { DeletePixelDialog } from '@/features/pixels/components/DeletePixelDialog'
import { PixelFormDialog } from '@/features/pixels/components/PixelFormDialog'
import { PixelsTableCard } from '@/features/pixels/components/PixelsTableCard'
import type {
  Pixel,
  PixelBusinessCenterOption,
  PixelFormValues,
  PixelPlatform,
  PixelStatus,
} from '@/features/pixels/types'
import { formatApiError } from '@/features/settings/components'
import { useAuthStore } from '@/hooks/useAuthStore'

const DEFAULT_PAGE_SIZE = 15

export function PixelsPage() {
  const permissions = useAuthStore((state) => state.user?.permissions ?? [])
  const canCreate = useMemo(
    () => hasPermission(permissions, PermissionSlugs.PixelsCreate),
    [permissions],
  )
  const canUpdate = useMemo(
    () => hasPermission(permissions, PermissionSlugs.PixelsUpdate),
    [permissions],
  )
  const canDelete = useMemo(
    () => hasPermission(permissions, PermissionSlugs.PixelsDelete),
    [permissions],
  )
  const [pixels, setPixels] = useState<Pixel[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [keyword, setKeyword] = useState<string | null>(null)
  const [platform, setPlatform] = useState<PixelPlatform | null>(null)
  const [businessCenterId, setBusinessCenterId] = useState<number | null>(null)
  const [status, setStatus] = useState<PixelStatus | null>(null)
  const [businessCenters, setBusinessCenters] = useState<PixelBusinessCenterOption[]>([])
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Pixel | null>(null)
  const [deleting, setDeleting] = useState<Pixel | null>(null)
  const [refreshSignal, setRefreshSignal] = useState(0)
  const reload = useCallback(() => setRefreshSignal((value) => value + 1), [])

  useEffect(() => {
    let ignore = false
    async function loadPixels() {
      setLoading(true)
      try {
        const result = await pixelsApi.list({
          query: keyword ?? undefined,
          platform: platform ?? undefined,
          business_center_id: businessCenterId ?? undefined,
          status: status ?? undefined,
          page: pageIndex + 1,
          per_page: pageSize,
        })
        if (!ignore) {
          setPixels(result.data)
          setRowCount(result.pagination.total)
        }
      } catch (error) {
        if (!ignore) toast.error(formatApiError(error))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    void loadPixels()
    return () => {
      ignore = true
    }
  }, [businessCenterId, keyword, pageIndex, pageSize, platform, refreshSignal, status])

  useEffect(() => {
    businessCentersApi
      .listOptions()
      .then((response) =>
        setBusinessCenters(
          response.data.data.filter(
            (option): option is PixelBusinessCenterOption =>
              option.ads_type === 'facebook' || option.ads_type === 'tiktok',
          ),
        ),
      )
      .catch((error) => toast.error(formatApiError(error)))
  }, [])

  const openCreateDialog = useCallback(() => {
    setEditing(null)
    setFormOpen(true)
  }, [])
  const openEditDialog = useCallback((pixel: Pixel) => {
    setEditing(pixel)
    setFormOpen(true)
  }, [])
  const handleFormOpenChange = useCallback((open: boolean) => {
    setFormOpen(open)
    if (!open) setEditing(null)
  }, [])
  const submit = useCallback(
    async (values: PixelFormValues) => {
      setSaving(true)
      try {
        if (editing) await pixelsApi.update(editing.id, values)
        else await pixelsApi.create(values)
        toast.success(editing ? 'Pixel Conversion updated' : 'Pixel Conversion created')
        setFormOpen(false)
        setEditing(null)
        reload()
      } catch (error) {
        toast.error(formatApiError(error))
      } finally {
        setSaving(false)
      }
    },
    [editing, reload],
  )

  return (
    <>
      <PixelsTableCard
        pixels={pixels}
        rowCount={rowCount}
        loading={loading}
        keyword={keyword}
        platform={platform}
        businessCenterId={businessCenterId}
        status={status}
        businessCenters={businessCenters}
        pageIndex={pageIndex}
        pageSize={pageSize}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onFilterChange={(filters) => {
          setKeyword(filters.keyword)
          setPlatform(filters.platform)
          setBusinessCenterId(filters.businessCenterId)
          setStatus(filters.status)
          setPageIndex(0)
        }}
        onPaginationChange={(nextPageIndex, nextPageSize) => {
          setPageIndex(nextPageIndex)
          setPageSize(nextPageSize)
        }}
        onAddClick={openCreateDialog}
        onEditRow={openEditDialog}
        onDeleteRow={setDeleting}
      />
      <PixelFormDialog
        open={formOpen}
        pixel={editing}
        saving={saving}
        businessCenters={businessCenters}
        onOpenChange={handleFormOpenChange}
        onSubmit={submit}
      />
      <DeletePixelDialog pixel={deleting} onOpenChange={setDeleting} onSuccess={reload} />
    </>
  )
}

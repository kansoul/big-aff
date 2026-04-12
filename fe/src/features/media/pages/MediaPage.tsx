import { useCallback, useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'

import { BulkDeleteDialog } from '@/components/common/BulkDeleteDialog'
import { mediaApi } from '@/features/media/api'
import { hasFullAccess } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { MediaTableCard, UploadFileDialog } from '@/features/media/components'
import { ImagePreviewDialog } from '@/components/common/ImagePreviewDialog'
import type { MediaFile, MediaFilterParams, MediaOrderBy } from '@/features/media/types'
import { usersApi } from '@/features/users/api/users'
import { formatApiError } from '@/features/settings/components'
import type { ManagedUser } from '@/shared/types'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type PaginationState = { pageIndex: number; pageSize: number }

const DEFAULT_FILTERS: MediaFilterParams = {
  created_from: null,
  created_to: null,
  order: null,
  order_by: null,
  user_id: null,
  alt_text: null,
}

export function MediaPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = hasFullAccess(user?.permissions ?? [])

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [data, setData] = useState<MediaFile[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 30 })
  const [filters, setFilters] = useState<MediaFilterParams>(DEFAULT_FILTERS)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  useEffect(() => {
    void usersApi
      .listOptions()
      .then((res) => setUsers(res.data.data as ManagedUser[]))
      .catch(() => {
        console.log('Failed to load users for media page filter')
      })
  }, [])

  const [refreshSignal, setRefreshSignal] = useState(0)
  const loadData = useCallback(() => {
    setRefreshSignal((s) => s + 1)
  }, [])

  useEffect(() => {
    let ignore = false

    const fetchData = async () => {
      try {
        const res = await mediaApi.list(pagination.pageIndex + 1, pagination.pageSize, filters)
        if (!ignore) {
          setData(res.data.data)
          setRowCount(res.data.pagination.total)
        }
      } catch (err) {
        if (!ignore) {
          toast.error(formatApiError(err))
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void fetchData()

    return () => {
      ignore = true
    }
  }, [pagination.pageIndex, pagination.pageSize, filters, refreshSignal])

  const onFilterChange = useCallback((patch: Partial<MediaFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    setLoading(true)
  }, [])

  const onFilterReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    setLoading(true)
  }, [])

  const onSortingChange = useCallback((sorting: { id: string; desc: boolean }[]) => {
    const first = sorting[0] ?? null
    setFilters((prev) => ({
      ...prev,
      order_by: first ? (first.id as MediaOrderBy) : null,
      order: first ? (first.desc ? 'desc' : 'asc') : null,
    }))
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  const onUploadClick = useCallback(() => {
    setUploadError(null)
    setUploadProgress(0)
    setUploadOpen(true)
  }, [])

  const onUploadOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setUploadError(null)
      setUploadProgress(0)
    }
    setUploadOpen(open)
  }, [])

  const onUploadSubmit = useCallback(
    async (file: File, options: { directory?: string | null; alt_text?: string | null }) => {
      try {
        setUploadError(null)
        setUploading(true)
        setUploadProgress(0)
        await mediaApi.upload(file, options, setUploadProgress)
        setUploadOpen(false)
        setUploadProgress(0)
        loadData()
        toast.success('File uploaded successfully')
      } catch (err) {
        setUploadError(formatApiError(err))
      } finally {
        setUploading(false)
      }
    },
    [loadData],
  )

  const onDeleteFile = useCallback((file: MediaFile) => {
    setDeleteTarget(file)
  }, [])

  const onBulkDeleteClick = useCallback(() => {
    setBulkDeleteOpen(true)
  }, [])

  const onBulkDeleteOpenChange = useCallback((open: boolean) => {
    setBulkDeleteOpen(open)
  }, [])

  const onConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await mediaApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      loadData()
      toast.success('File deleted successfully')
    } catch {
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, loadData])

  const onConfirmBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    try {
      setBulkDeleting(true)
      const results = await Promise.allSettled(ids.map((id) => mediaApi.delete(id)))
      const failedIds = new Set<number>()
      let firstError: unknown = null

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failedIds.add(ids[index])
          if (!firstError) firstError = result.reason
        }
      })

      const deletedCount = ids.length - failedIds.size
      if (deletedCount > 0) {
        toast.success(`Deleted ${deletedCount} file${deletedCount > 1 ? 's' : ''} successfully`)
      }
      if (firstError) {
        toast.error(formatApiError(firstError))
      }

      setSelectedIds(failedIds)
      setBulkDeleteOpen(false)
      loadData()
    } finally {
      setBulkDeleting(false)
    }
  }, [selectedIds, loadData])

  return (
    <div className="flex flex-col gap-8">
      <MediaTableCard
        data={data}
        rowCount={rowCount}
        loading={loading}
        pagination={pagination}
        onPaginationChange={setPagination}
        filters={filters}
        onFilterChange={onFilterChange}
        onFilterReset={onFilterReset}
        onSortingChange={onSortingChange}
        users={users}
        onUploadClick={onUploadClick}
        onDeleteFile={onDeleteFile}
        canDelete
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onBulkDeleteClick={onBulkDeleteClick}
      />
      <UploadFileDialog
        open={uploadOpen}
        onOpenChange={onUploadOpenChange}
        formError={uploadError}
        uploadProgress={uploadProgress}
        submitting={uploading}
        isAdmin={isAdmin}
        onSubmit={onUploadSubmit}
      />

      <ImagePreviewDialog
        src={previewFile?.url}
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2 />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">{deleteTarget?.original_name}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                void onConfirmDelete()
              }}
              disabled={deleting}
              variant="destructive"
            >
              {deleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={onBulkDeleteOpenChange}
        count={selectedIds.size}
        itemLabel="file"
        deleting={bulkDeleting}
        onConfirm={onConfirmBulkDelete}
      />
    </div>
  )
}

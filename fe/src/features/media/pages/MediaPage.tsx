import { useCallback, useEffect, useState } from 'react'

import { mediaApi } from '@/features/media/api'
import { FileDetailDialog, MediaTableCard, UploadFileDialog } from '@/features/media/components'
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
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type PaginationState = { pageIndex: number; pageSize: number }

const DEFAULT_FILTERS: MediaFilterParams = {
  created_from: null,
  created_to: null,
  order: null,
  order_by: null,
  user_id: null,
}

export function MediaPage() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [data, setData] = useState<MediaFile[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 15 })
  const [filters, setFilters] = useState<MediaFilterParams>(DEFAULT_FILTERS)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailFile, setDetailFile] = useState<MediaFile | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    void usersApi
      .list()
      .then(setUsers)
      .catch(() => {
        console.log('Failed to load users for media page filter')
      })
  }, [])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await mediaApi.list(pagination.pageIndex + 1, pagination.pageSize, filters)
      setData(res.data.data)
      setRowCount(res.data.pagination.total)
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }, [pagination, filters])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const onFilterChange = useCallback(
    (field: keyof MediaFilterParams, value: string | number | null) => {
      setFilters((prev) => ({ ...prev, [field]: value }))
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    },
    [],
  )

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
    async (
      file: File,
      options: { disk?: string | null; directory?: string | null; alt_text?: string | null },
    ) => {
      try {
        setUploadError(null)
        setUploading(true)
        setUploadProgress(0)
        await mediaApi.upload(file, options, setUploadProgress)
        setUploadOpen(false)
        setUploadProgress(0)
        await loadData()
        toast.success('File uploaded successfully')
      } catch (err) {
        setUploadError(formatApiError(err))
      } finally {
        setUploading(false)
      }
    },
    [loadData],
  )

  const onFileClick = useCallback((file: MediaFile) => {
    if (file.mime_type?.startsWith('image/') || file.mime_type?.startsWith('video/')) {
      setPreviewFile(file)
    } else {
      setDetailError(null)
      setDetailLoading(false)
      setDetailFile(file)
      setDetailOpen(true)
    }
  }, [])

  const onDetailOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setDetailFile(null)
      setDetailError(null)
    }
    setDetailOpen(open)
  }, [])

  const onDeleteFile = useCallback((file: MediaFile) => {
    setDeleteTarget(file)
  }, [])

  const onConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await mediaApi.delete(deleteTarget.id)
      setDeleteTarget(null)
      await loadData()
      toast.success('File deleted successfully')
    } catch {
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, loadData])

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
        onSortingChange={onSortingChange}
        users={users}
        onUploadClick={onUploadClick}
        onFileClick={onFileClick}
        onDeleteFile={onDeleteFile}
      />
      <UploadFileDialog
        open={uploadOpen}
        onOpenChange={onUploadOpenChange}
        formError={uploadError}
        uploadProgress={uploadProgress}
        submitting={uploading}
        onSubmit={onUploadSubmit}
      />
      <FileDetailDialog
        open={detailOpen}
        onOpenChange={onDetailOpenChange}
        loading={detailLoading}
        error={detailError}
        file={detailFile}
      />
      <ImagePreviewDialog
        src={previewFile?.url}
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        type={previewFile?.mime_type?.startsWith('video/') ? 'video' : 'image'}
      />
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-foreground">{deleteTarget?.original_name}</span>{' '}
              will be permanently deleted. This action cannot be undone.
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

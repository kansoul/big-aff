import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { BulkDeleteDialog } from '@/components/common/BulkDeleteDialog'
import { formatApiError } from '@/features/settings/components'
import { channelsApi } from '@/features/channels/api'
import {
  BulkCreateChannelDialog,
  ChannelsTableCard,
  DeleteChannelDialog,
} from '@/features/channels/components'
import {
  channelBulkCreateSchema,
  type Channel,
  type ChannelBulkCreateFormValues,
} from '@/features/channels/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'

export function ChannelsPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])

  const canCreate = useMemo(() => hasPermission(perms, PermissionSlugs.ChannelsCreate), [perms])
  const canDelete = useMemo(() => hasPermission(perms, PermissionSlugs.ChannelsDelete), [perms])

  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [deleteRow, setDeleteRow] = useState<Channel | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importSuccessCount, setImportSuccessCount] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const createForm = useForm<ChannelBulkCreateFormValues>({
    resolver: zodResolver(channelBulkCreateSchema),
    defaultValues: { lines: '' },
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const result = await channelsApi.list()
      setChannels(result.data ?? [])
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const onCreateOpenChange = useCallback(
    (open: boolean) => {
      setCreateOpen(open)
      if (open) {
        setFormError(null)
        setImportErrors([])
        setImportSuccessCount(0)
        createForm.reset({ lines: '' })
      }
    },
    [createForm],
  )

  const onCreateSubmit = async (values: ChannelBulkCreateFormValues) => {
    try {
      setFormError(null)
      setSubmitting(true)
      const result = await channelsApi.bulkCreate(values)
      setImportErrors(result.errors ?? [])
      setImportSuccessCount(result.data?.length ?? 0)
      if (result.data?.length > 0) {
        createForm.reset({ lines: '' })
        await loadData()
      }
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const onDeleteRow = useCallback((row: Channel) => {
    setDeleteRow(row)
  }, [])

  const onDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteRow(null)
  }, [])

  const onDeleteSuccess = useCallback(() => {
    setDeleteRow(null)
    void loadData()
  }, [loadData])

  const onBulkDeleteClick = useCallback(() => {
    setBulkDeleteOpen(true)
  }, [])

  const onBulkDeleteOpenChange = useCallback((open: boolean) => {
    setBulkDeleteOpen(open)
  }, [])

  const onBulkDeleteConfirm = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    try {
      setBulkDeleting(true)
      const results = await Promise.allSettled(ids.map((id) => channelsApi.remove(id)))
      const failedIds = new Set<number>()
      let firstError: unknown = null

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failedIds.add(ids[index])
          if (!firstError) firstError = result.reason
        }
      })

      if (firstError) {
        toast.error(formatApiError(firstError))
      }

      setSelectedIds(failedIds)
      setBulkDeleteOpen(false)
      await loadData()
    } finally {
      setBulkDeleting(false)
    }
  }, [selectedIds, loadData])

  const onAddClick = useCallback(() => {
    setFormError(null)
    setImportErrors([])
    setImportSuccessCount(0)
    setCreateOpen(true)
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <ChannelsTableCard
        loading={loading}
        channels={channels}
        canCreate={canCreate}
        canDelete={canDelete}
        onAddClick={onAddClick}
        onDeleteRow={onDeleteRow}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onBulkDeleteClick={onBulkDeleteClick}
      />
      <BulkCreateChannelDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        form={createForm}
        submitting={submitting}
        formError={formError}
        importErrors={importErrors}
        importSuccessCount={importSuccessCount}
        onSubmit={onCreateSubmit}
      />
      <DeleteChannelDialog
        channel={deleteRow}
        onOpenChange={onDeleteOpenChange}
        onSuccess={onDeleteSuccess}
      />
      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={onBulkDeleteOpenChange}
        count={selectedIds.size}
        itemLabel="channel"
        deleting={bulkDeleting}
        onConfirm={onBulkDeleteConfirm}
      />
    </div>
  )
}

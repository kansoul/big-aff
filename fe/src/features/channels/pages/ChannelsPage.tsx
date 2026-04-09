import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

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
  const [listError, setListError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [deleteRow, setDeleteRow] = useState<Channel | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importSuccessCount, setImportSuccessCount] = useState(0)

  const createForm = useForm<ChannelBulkCreateFormValues>({
    resolver: zodResolver(channelBulkCreateSchema),
    defaultValues: { lines: '' },
  })

  const loadData = useCallback(async () => {
    try {
      setListError(null)
      setLoading(true)
      const result = await channelsApi.list()
      setChannels(result.data ?? [])
    } catch (err) {
      setListError(formatApiError(err))
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
    setDeleteError(null)
    setDeleteRow(row)
  }, [])

  const onDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setDeleteRow(null)
      setDeleteError(null)
    }
  }, [])

  const onDeleteConfirm = async () => {
    if (!deleteRow) {
      return
    }
    try {
      setSubmitting(true)
      await channelsApi.remove(deleteRow.id)
      setDeleteRow(null)
      await loadData()
    } catch (err) {
      setDeleteError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const onAddClick = useCallback(() => {
    setFormError(null)
    setImportErrors([])
    setImportSuccessCount(0)
    setCreateOpen(true)
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <ChannelsTableCard
        listError={listError}
        loading={loading}
        channels={channels}
        canCreate={canCreate}
        canDelete={canDelete}
        onAddClick={onAddClick}
        onDeleteRow={onDeleteRow}
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
        submitting={submitting}
        error={deleteError}
        onConfirm={onDeleteConfirm}
      />
    </div>
  )
}

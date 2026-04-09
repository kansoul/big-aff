import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { formatApiError } from '@/features/settings/components'
import { stylesApi } from '@/features/styles/api'
import {
  BulkCreateStyleDialog,
  DeleteStyleDialog,
  StylesTableCard,
} from '@/features/styles/components'
import {
  styleBulkCreateSchema,
  type Style,
  type StyleBulkCreateFormValues,
} from '@/features/styles/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'

export function StylesPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])

  const canCreate = useMemo(() => hasPermission(perms, PermissionSlugs.StylesCreate), [perms])
  const canDelete = useMemo(() => hasPermission(perms, PermissionSlugs.StylesDelete), [perms])

  const [styles, setStyles] = useState<Style[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [deleteRow, setDeleteRow] = useState<Style | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importSuccessCount, setImportSuccessCount] = useState(0)

  const createForm = useForm<StyleBulkCreateFormValues>({
    resolver: zodResolver(styleBulkCreateSchema),
    defaultValues: { lines: '' },
  })

  const loadData = useCallback(async () => {
    try {
      setListError(null)
      setLoading(true)
      const result = await stylesApi.list()
      setStyles(result.data ?? [])
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

  const onCreateSubmit = async (values: StyleBulkCreateFormValues) => {
    try {
      setFormError(null)
      setSubmitting(true)
      const result = await stylesApi.bulkCreate(values)
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

  const onDeleteRow = useCallback((row: Style) => {
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
      await stylesApi.remove(deleteRow.id)
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
      <StylesTableCard
        listError={listError}
        loading={loading}
        styles={styles}
        canCreate={canCreate}
        canDelete={canDelete}
        onAddClick={onAddClick}
        onDeleteRow={onDeleteRow}
      />
      <BulkCreateStyleDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        form={createForm}
        submitting={submitting}
        formError={formError}
        importErrors={importErrors}
        importSuccessCount={importSuccessCount}
        onSubmit={onCreateSubmit}
      />
      <DeleteStyleDialog
        style={deleteRow}
        onOpenChange={onDeleteOpenChange}
        submitting={submitting}
        error={deleteError}
        onConfirm={onDeleteConfirm}
      />
    </div>
  )
}

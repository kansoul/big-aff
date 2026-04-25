import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { BulkDeleteDialog } from '@/components/common/BulkDeleteDialog'
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

  const [createOpen, setCreateOpen] = useState(false)
  const [deleteRow, setDeleteRow] = useState<Style | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const createForm = useForm<StyleBulkCreateFormValues>({
    resolver: zodResolver(styleBulkCreateSchema),
    defaultValues: { lines: '' },
  })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const result = await stylesApi.list()
      setStyles(result.data ?? [])
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
      const errors = result.errors ?? []
      const successCount = result.data?.length ?? 0
      setImportErrors(errors)
      if (successCount > 0) {
        toast.success(`${successCount} style(s) created successfully.`)
        createForm.reset({ lines: '' })
        await loadData()
        if (errors.length === 0) {
          setCreateOpen(false)
        }
      }
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const onCreateAnotherSubmit = async (values: StyleBulkCreateFormValues) => {
    try {
      setFormError(null)
      setSubmitting(true)
      const result = await stylesApi.bulkCreate(values)
      const errors = result.errors ?? []
      const successCount = result.data?.length ?? 0
      setImportErrors(errors)
      if (successCount > 0) {
        toast.success(`${successCount} style(s) created successfully.`)
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
      const results = await Promise.allSettled(ids.map((id) => stylesApi.remove(id)))
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
    setCreateOpen(true)
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <StylesTableCard
        loading={loading}
        styles={styles}
        canCreate={canCreate}
        canDelete={canDelete}
        onAddClick={onAddClick}
        onDeleteRow={onDeleteRow}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onBulkDeleteClick={onBulkDeleteClick}
      />
      <BulkCreateStyleDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        form={createForm}
        submitting={submitting}
        formError={formError}
        importErrors={importErrors}
        onSubmit={onCreateSubmit}
        onSubmitAnother={onCreateAnotherSubmit}
      />
      <DeleteStyleDialog
        style={deleteRow}
        onOpenChange={onDeleteOpenChange}
        onSuccess={onDeleteSuccess}
      />
      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={onBulkDeleteOpenChange}
        count={selectedIds.size}
        itemLabel="style"
        deleting={bulkDeleting}
        onConfirm={onBulkDeleteConfirm}
      />
    </div>
  )
}

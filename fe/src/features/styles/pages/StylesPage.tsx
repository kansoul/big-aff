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
  type StyleFilterParams,
} from '@/features/styles/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { useTableUrlState } from '@/hooks/useTableUrlState'
import { setPaginationInParams, type TablePaginationState } from '@/lib/utils'

const DEFAULT_FILTERS: StyleFilterParams = {
  query: null,
}

function parseFilters(params: URLSearchParams): StyleFilterParams {
  return {
    query: params.get('query'),
  }
}

function buildParams(
  filters: StyleFilterParams,
  pagination: TablePaginationState,
): URLSearchParams {
  const params = new URLSearchParams()
  const query: string | null | undefined = filters.query
  if (query) params.set('query', query)
  setPaginationInParams(params, pagination)
  return params
}

export function StylesPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])

  const canCreate = useMemo(() => hasPermission(perms, PermissionSlugs.StylesCreate), [perms])
  const canDelete = useMemo(() => hasPermission(perms, PermissionSlugs.StylesDelete), [perms])

  const [data, setData] = useState<Style[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const { filters, pagination, setPagination, onFilterChange, onFilterReset } =
    useTableUrlState<StyleFilterParams>({
      parseFilters,
      buildParams,
      defaultFilters: DEFAULT_FILTERS,
    })

  const [createOpen, setCreateOpen] = useState(false)
  const [deleteRow, setDeleteRow] = useState<Style | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const [refreshSignal, setRefreshSignal] = useState(0)
  const loadData = useCallback(() => setRefreshSignal((s) => s + 1), [])

  useEffect(() => {
    let ignore = false
    const fetchData = async () => {
      try {
        setLoading(true)
        const query: string | null | undefined = filters.query
        const result = await stylesApi.list({
          query: query ?? undefined,
          page: pagination.pageIndex + 1,
          per_page: pagination.pageSize,
        })
        if (!ignore) {
          setData(result.data ?? [])
          setRowCount(result.pagination?.total ?? 0)
        }
      } catch (err) {
        if (!ignore) toast.error(formatApiError(err))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    void fetchData()
    return () => {
      ignore = true
    }
  }, [pagination.pageIndex, pagination.pageSize, filters, refreshSignal])

  const createForm = useForm<StyleBulkCreateFormValues>({
    resolver: zodResolver(styleBulkCreateSchema),
    defaultValues: { lines: '' },
  })

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
        loadData()
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
        loadData()
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
    loadData()
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
      loadData()
    } finally {
      setBulkDeleting(false)
    }
  }, [selectedIds, loadData])

  const onAddClick = useCallback(() => {
    setFormError(null)
    setImportErrors([])
    setCreateOpen(true)
  }, [])

  const apiFilters = { ...filters, page: pagination.pageIndex + 1, per_page: pagination.pageSize }

  return (
    <div className="flex flex-col gap-8">
      <StylesTableCard
        data={data}
        rowCount={rowCount}
        loading={loading}
        filters={apiFilters}
        onFilterChange={onFilterChange}
        onFilterReset={onFilterReset}
        onPaginationChange={(page, perPage) =>
          setPagination({ pageIndex: page - 1, pageSize: perPage })
        }
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

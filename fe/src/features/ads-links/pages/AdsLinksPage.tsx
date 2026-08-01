import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { formatApiError } from '@/features/settings/components'
import { adsLinksApi, siteOptionsApi, userOptionsApi } from '@/features/ads-links/api'
import {
  AdsLinksTableCard,
  CreateAdsLinkDialog,
  EditAdsLinkDialog,
} from '@/features/ads-links/components'
import {
  adsLinkCreateSchema,
  adsLinkUpdateSchema,
  type AdsLink,
  type AdsLinkCreateFormValues,
  type AdsLinkFilterParams,
  type AdsLinkUpdateFormValues,
  type SiteOption,
  type UserOption,
} from '@/features/ads-links/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { useTableUrlState } from '@/hooks/useTableUrlState'
import { setPaginationInParams, type TablePaginationState } from '@/lib/utils'
import { getUserRole } from '@/constants/role'

const DEFAULT_FILTERS: AdsLinkFilterParams = {
  keyword: null,
  site_id: null,
  created_by: null,
  googleid: null,
  date_range: null,
  is_hidden: 0,
  order_by: null,
  order: null,
}

function parseFilters(params: URLSearchParams): AdsLinkFilterParams {
  const dateFrom = params.get('date_from')
  const dateTo = params.get('date_to')
  return {
    keyword: params.get('keyword'),
    site_id: params.get('site_id') ? Number(params.get('site_id')) : null,
    created_by: params.get('created_by') ? Number(params.get('created_by')) : null,
    googleid: params.get('googleid'),
    date_range: dateFrom || dateTo ? { from: dateFrom, to: dateTo } : null,
    is_hidden: params.get('is_hidden') !== null ? (Number(params.get('is_hidden')) as 0 | 1) : 0,
    order_by: params.get('order_by'),
    order: params.get('order') as 'asc' | 'desc' | null,
  }
}

function buildParams(
  filters: AdsLinkFilterParams,
  pagination: TablePaginationState,
): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.keyword) params.set('keyword', filters.keyword)
  if (filters.site_id != null) params.set('site_id', String(filters.site_id))
  if (filters.created_by != null) params.set('created_by', String(filters.created_by))
  if (filters.googleid) params.set('googleid', filters.googleid)
  if (filters.date_range?.from) params.set('date_from', filters.date_range.from)
  if (filters.date_range?.to) params.set('date_to', filters.date_range.to)
  if (filters.is_hidden != null) params.set('is_hidden', String(filters.is_hidden))
  if (filters.order_by) params.set('order_by', filters.order_by)
  if (filters.order) params.set('order', filters.order)
  setPaginationInParams(params, pagination, 15)
  return params
}

const createDefaultValues: AdsLinkCreateFormValues = {
  site_id: 0,
  rac: '',
  note: '',
  googleid: '',
  tiktokid: '',
  tiktok_pixel_id: '',
}

export function AdsLinksPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])
  const role = getUserRole(user?.roles ?? [], !!user?.is_admin)

  const canCreate = useMemo(() => hasPermission(perms, PermissionSlugs.AdsLinksCreate), [perms])
  const canUpdate = useMemo(() => hasPermission(perms, PermissionSlugs.AdsLinksUpdate), [perms])

  const [adsLinks, setAdsLinks] = useState<AdsLink[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [sites, setSites] = useState<SiteOption[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const { filters, setFilters, pagination, setPagination } = useTableUrlState<AdsLinkFilterParams>({
    parseFilters,
    buildParams,
    defaultFilters: DEFAULT_FILTERS,
    defaultPageSize: 15,
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [editRow, setEditRow] = useState<AdsLink | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const createForm = useForm<AdsLinkCreateFormValues>({
    resolver: zodResolver(adsLinkCreateSchema),
    defaultValues: createDefaultValues,
  })

  const editForm = useForm<AdsLinkUpdateFormValues>({
    resolver: zodResolver(adsLinkUpdateSchema),
    defaultValues: {
      rac: '',
      googleid: '',
      tiktokid: '',
      tiktok_pixel_id: '',
    },
  })

  const loadOptions = useCallback(async () => {
    const [siteList, userList] = await Promise.all([siteOptionsApi.list(), userOptionsApi.list()])
    setSites(siteList)
    setUsers(userList)
  }, [])

  const [refreshSignal, setRefreshSignal] = useState(0)
  const loadData = useCallback(() => setRefreshSignal((s) => s + 1), [])

  useEffect(() => {
    void loadOptions()
  }, [loadOptions])

  useEffect(() => {
    let ignore = false
    const fetchData = async () => {
      try {
        setListError(null)
        setLoading(true)
        const result = await adsLinksApi.list({
          ...filters,
          page: pagination.pageIndex + 1,
          per_page: pagination.pageSize,
        })
        if (!ignore) {
          setAdsLinks(result.data ?? [])
          setTotalRows(result.pagination?.total ?? 0)
        }
      } catch (err) {
        if (!ignore) setListError(formatApiError(err))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    void fetchData()
    return () => {
      ignore = true
    }
  }, [pagination.pageIndex, pagination.pageSize, filters, refreshSignal])

  useEffect(() => {
    if (editRow) {
      editForm.reset({
        rac: editRow.rac,
        googleid: editRow.googleid?.join(',') ?? '',
        tiktokid: editRow.tiktokid?.join(',') ?? '',
        tiktok_pixel_id: editRow.tiktok_pixel_id?.join(',') ?? '',
        note: editRow.note ?? '',
      })
    }
  }, [editRow, editForm])

  const onCreateOpenChange = useCallback(
    (open: boolean) => {
      setCreateOpen(open)
      if (open) {
        setFormError(null)
        createForm.reset(createDefaultValues)
      } else {
        setFormError(null)
      }
    },
    [createForm],
  )

  const onCreateSubmit = async (
    values: AdsLinkCreateFormValues,
    options?: {
      createAnother?: boolean
    },
  ) => {
    try {
      setFormError(null)
      setSubmitting(true)
      await adsLinksApi.create({
        site_id: values.site_id,
        rac: values.rac,
        note: values.note ?? null,
        googleid: values.googleid ?? null,
        tiktokid: values.tiktokid ?? null,
        tiktok_pixel_id: values.tiktok_pixel_id ?? null,
      })
      createForm.reset(createDefaultValues)
      if (!options?.createAnother) {
        setCreateOpen(false)
      }
      loadData()
    } catch (err) {
      const msg = formatApiError(err)
      setFormError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const onEditSubmit = async (values: AdsLinkUpdateFormValues) => {
    if (!editRow) {
      return
    }
    try {
      setFormError(null)
      setSubmitting(true)
      await adsLinksApi.update(editRow.id, {
        rac: values.rac,
        googleid: values.googleid ?? null,
        tiktokid: values.tiktokid ?? null,
        tiktok_pixel_id: values.tiktok_pixel_id ?? null,
        note: values.note ?? null,
      })
      setEditRow(null)
      loadData()
    } catch (err) {
      const msg = formatApiError(err)
      setFormError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const onToggleHide = useCallback(
    async (row: AdsLink) => {
      try {
        await adsLinksApi.toggleHide(row.id)
        loadData()
      } catch (err) {
        setListError(formatApiError(err))
      }
    },
    [loadData],
  )

  const onFilterChange = useCallback(
    (patch: Partial<AdsLinkFilterParams>) => {
      const { date_range, is_hidden, ...rest } = patch
      const range = date_range as { from: string | null; to: string | null } | undefined
      setFilters((prev) => ({
        ...prev,
        ...rest,
        is_hidden: is_hidden == 1 ? 1 : is_hidden == 0 ? 0 : undefined,
        date_range: range,
      }))
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    },
    [setFilters, setPagination],
  )

  const onFilterReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [setFilters, setPagination])

  const onSortingChange = useCallback(
    (orderBy: string | null, order: 'asc' | 'desc' | null) => {
      setFilters((prev) => ({ ...prev, order_by: orderBy, order }))
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    },
    [setFilters, setPagination],
  )

  const onAddClick = useCallback(() => {
    setFormError(null)
    createForm.reset(createDefaultValues)
    setCreateOpen(true)
  }, [createForm])

  const onEditRow = useCallback((row: AdsLink) => {
    setFormError(null)
    setEditRow(row)
  }, [])

  const onEditOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setEditRow(null)
      setFormError(null)
    }
  }, [])

  return (
    <div className="flex flex-col gap-8">
      <AdsLinksTableCard
        listError={listError}
        loading={loading}
        adsLinks={adsLinks}
        totalRows={totalRows}
        canCreate={canCreate}
        canUpdate={canUpdate}
        filters={{ ...filters, page: pagination.pageIndex + 1, per_page: pagination.pageSize }}
        sites={sites}
        users={users}
        onFilterChange={onFilterChange}
        onFilterReset={onFilterReset}
        onAddClick={onAddClick}
        onEditRow={onEditRow}
        onToggleHide={(row) => void onToggleHide(row)}
        onPaginationChange={(page, perPage) =>
          setPagination({ pageIndex: page - 1, pageSize: perPage })
        }
        onSortingChange={onSortingChange}
        role={role}
      />
      <CreateAdsLinkDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        formError={formError}
        form={createForm}
        sites={sites}
        submitting={submitting}
        onSubmit={onCreateSubmit}
      />
      <EditAdsLinkDialog
        adsLink={editRow}
        onOpenChange={onEditOpenChange}
        formError={formError}
        form={editForm}
        submitting={submitting}
        onSubmit={onEditSubmit}
      />
    </div>
  )
}

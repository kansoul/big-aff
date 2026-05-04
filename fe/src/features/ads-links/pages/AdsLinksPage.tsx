import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

import { formatApiError } from '@/features/settings/components'
import {
  adsLinksApi,
  channelOptionsApi,
  postOptionsApi,
  siteOptionsApi,
  userOptionsApi,
} from '@/features/ads-links/api'
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
  type ChannelOption,
  type PostOption,
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
  post_id: null,
  channel_code: null,
  created_by: null,
  pixel_id: null,
  googleid: null,
  date_range: null,
  is_hidden: undefined,
  order_by: null,
  order: null,
}

function parseFilters(params: URLSearchParams): AdsLinkFilterParams {
  const dateFrom = params.get('date_from')
  const dateTo = params.get('date_to')
  return {
    keyword: params.get('keyword'),
    site_id: params.get('site_id') ? Number(params.get('site_id')) : null,
    post_id: params.get('post_id') ? Number(params.get('post_id')) : null,
    channel_code: params.get('channel_code'),
    created_by: params.get('created_by') ? Number(params.get('created_by')) : null,
    pixel_id: params.get('pixel_id'),
    googleid: params.get('googleid'),
    date_range: dateFrom || dateTo ? { from: dateFrom, to: dateTo } : null,
    is_hidden:
      params.get('is_hidden') !== null ? (Number(params.get('is_hidden')) as 0 | 1) : undefined,
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
  if (filters.post_id != null) params.set('post_id', String(filters.post_id))
  if (filters.channel_code) params.set('channel_code', filters.channel_code)
  if (filters.created_by != null) params.set('created_by', String(filters.created_by))
  if (filters.pixel_id) params.set('pixel_id', filters.pixel_id)
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
  post_id: 0,
  channel_code: '',
  rac: '',
  keyword_set_id: null,
  note: '',
  fbid: '',
  googleid: '',
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
  const [posts, setPosts] = useState<PostOption[]>([])
  const [channels, setChannels] = useState<ChannelOption[]>([])
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
    defaultValues: { rac: '', channel_code: null, keyword_set_id: null, fbid: '', googleid: '' },
  })

  const loadOptions = useCallback(async () => {
    const [siteList, postList, channelList, userList] = await Promise.all([
      siteOptionsApi.list(),
      postOptionsApi.list(),
      channelOptionsApi.list(),
      userOptionsApi.list(),
    ])
    setSites(siteList)
    setPosts(postList)
    setChannels(channelList)
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
        channel_code: editRow.channel_code ?? null,
        keyword_set_id: editRow.keyword_set?.id ?? null,
        fbid: editRow.fbid?.join(',') ?? '',
        googleid: editRow.googleid?.join(',') ?? '',
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
        post_id: values.post_id,
        channel_code: values.channel_code,
        rac: values.rac,
        keyword_set_id: values.keyword_set_id ?? null,
        note: values.note ?? null,
        fbid: values.fbid ?? null,
        googleid: values.googleid ?? null,
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
        channel_code: editRow.is_old ? (values.channel_code ?? null) : undefined,
        keyword_set_id: values.keyword_set_id ?? null,
        fbid: values.fbid ?? null,
        googleid: values.googleid ?? null,
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
    setCreateOpen(true)
  }, [])

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
        posts={posts}
        channels={channels}
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
        posts={posts}
        channels={channels}
        submitting={submitting}
        onSubmit={onCreateSubmit}
      />
      <EditAdsLinkDialog
        adsLink={editRow}
        posts={posts}
        channels={channels}
        onOpenChange={onEditOpenChange}
        formError={formError}
        form={editForm}
        submitting={submitting}
        onSubmit={onEditSubmit}
      />
    </div>
  )
}

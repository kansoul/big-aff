import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

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
  type Pagination,
  type PostOption,
  type SiteOption,
  type UserOption,
} from '@/features/ads-links/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'

export function AdsLinksPage() {
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])

  const canCreate = useMemo(() => hasPermission(perms, PermissionSlugs.AdsLinksCreate), [perms])
  const canUpdate = useMemo(() => hasPermission(perms, PermissionSlugs.AdsLinksUpdate), [perms])

  const [adsLinks, setAdsLinks] = useState<AdsLink[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [sites, setSites] = useState<SiteOption[]>([])
  const [posts, setPosts] = useState<PostOption[]>([])
  const [channels, setChannels] = useState<ChannelOption[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AdsLinkFilterParams>({ page: 1, per_page: 15 })

  const [createOpen, setCreateOpen] = useState(false)
  const [editRow, setEditRow] = useState<AdsLink | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const createForm = useForm<AdsLinkCreateFormValues>({
    resolver: zodResolver(adsLinkCreateSchema),
    defaultValues: {
      site_id: 0,
      post_id: 0,
      channel_code: '',
      rac: '',
      keyword_set_id: null,
      note: '',
      fbid: '',
      googleid: '',
    },
  })

  const editForm = useForm<AdsLinkUpdateFormValues>({
    resolver: zodResolver(adsLinkUpdateSchema),
    defaultValues: { rac: '', keyword_set_id: null, fbid: '', googleid: '' },
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

  const loadData = useCallback(async (activeFilters: AdsLinkFilterParams = {}) => {
    try {
      setListError(null)
      setLoading(true)
      const result = await adsLinksApi.list(activeFilters)
      setAdsLinks(result.data ?? [])
      setPagination(result.pagination ?? null)
    } catch (err) {
      setListError(formatApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadOptions()
  }, [loadOptions])

  useEffect(() => {
    void loadData(filters)
  }, [loadData, filters])

  useEffect(() => {
    if (editRow) {
      editForm.reset({
        rac: editRow.rac,
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
        createForm.reset({
          site_id: 0,
          post_id: 0,
          channel_code: '',
          rac: '',
          keyword_set_id: null,
          note: '',
          fbid: '',
          googleid: '',
        })
      } else {
        setFormError(null)
      }
    },
    [createForm],
  )

  const onCreateSubmit = async (values: AdsLinkCreateFormValues) => {
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
      setCreateOpen(false)
      await loadData(filters)
    } catch (err) {
      setFormError(formatApiError(err))
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
        keyword_set_id: values.keyword_set_id ?? null,
        fbid: values.fbid ?? null,
        googleid: values.googleid ?? null,
      })
      setEditRow(null)
      await loadData(filters)
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  const onToggleHide = useCallback(
    async (row: AdsLink) => {
      try {
        await adsLinksApi.toggleHide(row.id)
        await loadData(filters)
      } catch (err) {
        setListError(formatApiError(err))
      }
    },
    [loadData, filters],
  )

  const onFilterChange = useCallback((patch: Partial<AdsLinkFilterParams>) => {
    const { date_range, is_hidden, ...rest } = patch
    const range = date_range as { from: string | null; to: string | null } | undefined

    setFilters((prev) => ({
      ...prev,
      ...rest,
      is_hidden: is_hidden == 1 ? 1 : is_hidden == 0 ? 0 : undefined,
      date_range: range,
      page: 1,
    }))
  }, [])

  const onFilterReset = useCallback(() => {
    setFilters({ page: 1, per_page: 15 })
  }, [])

  const onPaginationChange = useCallback((page: number, perPage: number) => {
    setFilters((prev) => ({ ...prev, page, per_page: perPage }))
  }, [])

  const onSortingChange = useCallback((orderBy: string | null, order: 'asc' | 'desc' | null) => {
    setFilters((prev) => ({ ...prev, order_by: orderBy, order, page: 1 }))
  }, [])

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
        totalRows={pagination?.total ?? 0}
        currentUserId={user?.id}
        canCreate={canCreate}
        canUpdate={canUpdate}
        filters={filters}
        sites={sites}
        posts={posts}
        channels={channels}
        users={users}
        onFilterChange={onFilterChange}
        onFilterReset={onFilterReset}
        onAddClick={onAddClick}
        onEditRow={onEditRow}
        onToggleHide={(row) => void onToggleHide(row)}
        onPaginationChange={onPaginationChange}
        onSortingChange={onSortingChange}
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
        onOpenChange={onEditOpenChange}
        formError={formError}
        form={editForm}
        submitting={submitting}
        onSubmit={onEditSubmit}
      />
    </div>
  )
}

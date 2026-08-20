import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { hasPermission, PermissionSlugs } from '@/constants/permissions'
import { linksApi } from '@/features/links/api'
import {
  CopyTrackingLinkDialog,
  LinkFormDialog,
  LinksTableCard,
  type CopyTrackingLinkTarget,
} from '@/features/links/components'
import type { Link, LinkFormValues, LinkStatus } from '@/features/links/types'
import { formatApiError } from '@/features/settings/components'
import { useAuthStore } from '@/hooks/useAuthStore'
import type { LinkPlatform } from '@/lib/link'

export function LinksPage() {
  const permissions = useAuthStore((state) => state.user?.permissions ?? [])
  const canCreate = useMemo(
    () => hasPermission(permissions, PermissionSlugs.LinksCreate),
    [permissions],
  )
  const canUpdate = useMemo(
    () => hasPermission(permissions, PermissionSlugs.LinksUpdate),
    [permissions],
  )
  const canDelete = useMemo(
    () => hasPermission(permissions, PermissionSlugs.LinksDelete),
    [permissions],
  )
  const [rows, setRows] = useState<Link[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<LinkStatus | 'all'>('all')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Link | null>(null)
  const [copyTarget, setCopyTarget] = useState<CopyTrackingLinkTarget | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await linksApi.list({
        keyword: keyword || undefined,
        status: status === 'all' ? undefined : status,
        page,
        per_page: perPage,
      })
      setRows(response.data)
      setTotalRows(response.pagination.total)
    } catch (error) {
      toast.error(formatApiError(error))
    } finally {
      setLoading(false)
    }
  }, [keyword, page, perPage, status])

  useEffect(() => {
    void load()
  }, [load])

  const applyFilters = useCallback((values: Record<string, unknown>) => {
    setPage(1)
    setKeyword(typeof values.keyword === 'string' ? values.keyword : '')
    setStatus(values.status === 'active' || values.status === 'inactive' ? values.status : 'all')
  }, [])

  const resetFilters = useCallback(() => {
    setPage(1)
    setKeyword('')
    setStatus('all')
  }, [])

  const submit = useCallback(
    async (values: LinkFormValues) => {
      setSaving(true)
      try {
        if (editing) await linksApi.update(editing.id, values)
        else await linksApi.create(values)
        toast.success(editing ? 'Link updated' : 'Link created')
        setDialogOpen(false)
        setEditing(null)
        await load()
      } catch (error) {
        toast.error(formatApiError(error))
      } finally {
        setSaving(false)
      }
    },
    [editing, load],
  )

  const remove = useCallback(
    async (link: Link) => {
      if (!window.confirm(`Delete “${link.name}”?`)) return
      try {
        await linksApi.delete(link.id)
        toast.success('Link deleted')
        await load()
      } catch (error) {
        toast.error(formatApiError(error))
      }
    },
    [load],
  )

  const previewCopy = useCallback((link: Link, platform: LinkPlatform) => {
    setCopyTarget({ link, platform })
  }, [])

  const changeCopyDialog = useCallback((open: boolean) => {
    if (!open) setCopyTarget(null)
  }, [])

  const add = useCallback(() => {
    setEditing(null)
    setDialogOpen(true)
  }, [])

  const edit = useCallback((link: Link) => {
    setEditing(link)
    setDialogOpen(true)
  }, [])

  const changePagination = useCallback((nextPage: number, nextPerPage: number) => {
    setPage(nextPage)
    setPerPage(nextPerPage)
  }, [])

  return (
    <section className="space-y-4">
      <LinksTableCard
        data={rows}
        rowCount={totalRows}
        loading={loading}
        page={page}
        perPage={perPage}
        keyword={keyword}
        status={status}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onPaginationChange={changePagination}
        onFilterApply={applyFilters}
        onFilterReset={resetFilters}
        onAddClick={add}
        onEditRow={edit}
        onDeleteRow={remove}
        onCopyLink={previewCopy}
      />

      <LinkFormDialog
        open={dialogOpen}
        link={editing}
        saving={saving}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditing(null)
        }}
        onSubmit={submit}
      />
      <CopyTrackingLinkDialog target={copyTarget} onOpenChange={changeCopyDialog} />
    </section>
  )
}

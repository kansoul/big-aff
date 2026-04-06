import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { MRT_SortingState } from 'mantine-react-table'
import { toast } from 'sonner'

import { sitesApi } from '@/features/sites/api'
import { SitesTableCard } from '@/features/sites/components/SitesTableCard'
import { DeleteSiteDialog } from '@/features/sites/components/DeleteSiteDialog'
import type { Site, SiteFilterParams, SiteOrderBy } from '@/features/sites/types'
import { formatApiError } from '@/features/settings/components'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { PATHS, siteEditPath, siteViewPath } from '@/constants/paths'
import { useAuthStore } from '@/hooks/useAuthStore'

type PaginationState = { pageIndex: number; pageSize: number }

const DEFAULT_FILTERS: SiteFilterParams = {
  keyword: null,
  status: null,
  order: null,
  order_by: null,
}

export function SettingsSitesPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const perms = useMemo(() => user?.permissions ?? [], [user?.permissions])
  const canCreate = useMemo(
    () => hasPermission(perms, PermissionSlugs.SettingsSitesCreate),
    [perms],
  )
  const canUpdate = useMemo(
    () => hasPermission(perms, PermissionSlugs.SettingsSitesUpdate),
    [perms],
  )
  const canDelete = useMemo(
    () => hasPermission(perms, PermissionSlugs.SettingsSitesDelete),
    [perms],
  )

  const onCreateClick = useCallback(() => void navigate(PATHS.settingsSitesCreate), [navigate])
  const onViewClick = useCallback((site: Site) => void navigate(siteViewPath(site.id)), [navigate])
  const onEditClick = useCallback((site: Site) => void navigate(siteEditPath(site.id)), [navigate])

  const [data, setData] = useState<Site[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 15 })
  const [filters, setFilters] = useState<SiteFilterParams>(DEFAULT_FILTERS)
  const [globalFilter, setGlobalFilter] = useState('')
  const isFirstRender = useRef(true)

  // Debounce globalFilter into filters.keyword — skip on initial mount
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, keyword: globalFilter || null }))
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    }, 400)
    return () => clearTimeout(timer)
  }, [globalFilter])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await sitesApi.list(pagination.pageIndex + 1, pagination.pageSize, filters)
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

  const onFilterChange = useCallback((field: keyof SiteFilterParams, value: string | null) => {
    setFilters((prev) => ({ ...prev, [field]: value }))
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  const onSortingChange = useCallback((sorting: MRT_SortingState) => {
    const first = sorting[0] ?? null
    setFilters((prev) => ({
      ...prev,
      order_by: first ? (first.id as SiteOrderBy) : null,
      order: first ? (first.desc ? 'desc' : 'asc') : null,
    }))
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  const [deletingSite, setDeletingSite] = useState<Site | null>(null)
  const [deleting, setDeleting] = useState(false)

  const onDeleteClick = useCallback((site: Site) => setDeletingSite(site), [])
  const onDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeletingSite(null)
  }, [])

  const onConfirmDelete = useCallback(async () => {
    if (!deletingSite) return
    try {
      setDeleting(true)
      await sitesApi.delete(deletingSite.id)
      toast.success(`Site "${deletingSite.name}" deleted.`)
      setDeletingSite(null)
      void loadData()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setDeleting(false)
    }
  }, [deletingSite, loadData])

  return (
    <div className="flex flex-col gap-8">
      <SitesTableCard
        data={data}
        rowCount={rowCount}
        loading={loading}
        pagination={pagination}
        onPaginationChange={setPagination}
        filters={filters}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
        onFilterChange={onFilterChange}
        onSortingChange={onSortingChange}
        canCreate={canCreate}
        onCreateClick={onCreateClick}
        onViewClick={onViewClick}
        canUpdate={canUpdate}
        onEditClick={onEditClick}
        canDelete={canDelete}
        onDeleteClick={onDeleteClick}
      />
      <DeleteSiteDialog
        site={deletingSite}
        onOpenChange={onDeleteDialogChange}
        deleting={deleting}
        onConfirmDelete={onConfirmDelete}
      />
    </div>
  )
}

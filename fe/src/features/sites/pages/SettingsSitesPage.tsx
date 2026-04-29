import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MRT_SortingState } from 'mantine-react-table'
import { toast } from 'sonner'

import { BulkDeleteDialog } from '@/components/common/BulkDeleteDialog'
import { sitesApi } from '@/features/sites/api'
import {
  AssignSiteUsersDialog,
  SiteFormDialog,
  SitesTableCard,
  ViewSiteDialog,
} from '@/features/sites/components'
import { DeleteSiteDialog } from '@/features/sites/components/DeleteSiteDialog'
import type { Site, SiteFilterParams, SiteOrderBy } from '@/features/sites/types'
import { formatApiError } from '@/features/settings/components'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import type { AssignChildOption } from '@/features/users/components/AssignUsersChildrenPicker'

type PaginationState = { pageIndex: number; pageSize: number }

const DEFAULT_FILTERS: SiteFilterParams = {
  keyword: null,
  status: null,
  order: null,
  order_by: null,
}

export function SettingsSitesPage() {
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
  const canAssign = useMemo(
    () => hasPermission(perms, PermissionSlugs.SettingsSitesAssign),
    [perms],
  )

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingSiteId, setEditingSiteId] = useState<number | null>(null)
  const [viewingSiteId, setViewingSiteId] = useState<number | null>(null)

  const onCreateClick = useCallback(() => {
    setEditingSiteId(null)
    setFormDialogOpen(true)
  }, [])
  const onViewClick = useCallback((site: Site) => {
    setViewingSiteId(site.id)
  }, [])
  const onEditClick = useCallback((site: Site) => {
    setEditingSiteId(site.id)
    setFormDialogOpen(true)
  }, [])

  const [data, setData] = useState<Site[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 30 })
  const [filters, setFilters] = useState<SiteFilterParams>(DEFAULT_FILTERS)

  const [refreshSignal, setRefreshSignal] = useState(0)
  const loadData = useCallback(() => {
    setRefreshSignal((s) => s + 1)
  }, [])

  useEffect(() => {
    let ignore = false

    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await sitesApi.list(pagination.pageIndex + 1, pagination.pageSize, filters)
        if (!ignore) {
          setData(res.data.data)
          setRowCount(res.data.pagination.total)
        }
      } catch (err) {
        if (!ignore) {
          toast.error(formatApiError(err))
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void fetchData()

    return () => {
      ignore = true
    }
  }, [pagination.pageIndex, pagination.pageSize, filters, refreshSignal])

  const onFilterChange = useCallback((patch: Partial<SiteFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  const onFilterReset = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
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

  // Assign users state
  const [assigningSite, setAssigningSite] = useState<Site | null>(null)
  const [assignOptions, setAssignOptions] = useState<AssignChildOption[]>([])
  const [assignOptionsLoading, setAssignOptionsLoading] = useState(false)
  const [assignUserIds, setAssignUserIds] = useState<number[]>([])
  const [assigning, setAssigning] = useState(false)
  const [assignFlashError, setAssignFlashError] = useState<string | null>(null)

  const onAssignClick = useCallback(async (site: Site) => {
    setAssigningSite(site)
    setAssignUserIds([])
    setAssignFlashError(null)
    try {
      setAssignOptionsLoading(true)
      const res = await sitesApi.userOptions(site.id)
      setAssignOptions(res.data.data as AssignChildOption[])
      setAssignUserIds(res.data.assigned_user_ids)
    } catch (err) {
      setAssignFlashError(formatApiError(err))
    } finally {
      setAssignOptionsLoading(false)
    }
  }, [])

  const onConfirmAssign = useCallback(async () => {
    if (!assigningSite) return
    try {
      setAssigning(true)
      setAssignFlashError(null)
      await sitesApi.assignUsers(assigningSite.id, assignUserIds)
      toast.success(`Assigned ${assignUserIds.length} user(s) to "${assigningSite.name}".`)
      setAssigningSite(null)
    } catch (err) {
      setAssignFlashError(formatApiError(err))
    } finally {
      setAssigning(false)
    }
  }, [assigningSite, assignUserIds])

  const [deletingSite, setDeletingSite] = useState<Site | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const onDeleteClick = useCallback((site: Site) => setDeletingSite(site), [])
  const onBulkDeleteClick = useCallback(() => {
    setBulkDeleteOpen(true)
  }, [])

  const onBulkDeleteOpenChange = useCallback((open: boolean) => {
    setBulkDeleteOpen(open)
  }, [])
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
      loadData()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setDeleting(false)
    }
  }, [deletingSite, loadData])

  const onConfirmBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    try {
      setBulkDeleting(true)
      const results = await Promise.allSettled(ids.map((id) => sitesApi.delete(id)))
      const failedIds = new Set<number>()
      let firstError: unknown = null

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          failedIds.add(ids[index])
          if (!firstError) firstError = result.reason
        }
      })

      const deletedCount = ids.length - failedIds.size
      if (deletedCount > 0) {
        toast.success(`Deleted ${deletedCount} site${deletedCount > 1 ? 's' : ''} successfully`)
      }
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

  return (
    <div className="flex flex-col gap-8">
      <SitesTableCard
        data={data}
        rowCount={rowCount}
        loading={loading}
        pagination={pagination}
        onPaginationChange={setPagination}
        filters={filters}
        onFilterChange={onFilterChange}
        onFilterReset={onFilterReset}
        onSortingChange={onSortingChange}
        canCreate={canCreate}
        onCreateClick={onCreateClick}
        canAssign={canAssign}
        onAssignClick={(site) => void onAssignClick(site)}
        onViewClick={onViewClick}
        canUpdate={canUpdate}
        onEditClick={onEditClick}
        canDelete={canDelete}
        onDeleteClick={onDeleteClick}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onBulkDeleteClick={onBulkDeleteClick}
      />
      <DeleteSiteDialog
        site={deletingSite}
        onOpenChange={onDeleteDialogChange}
        deleting={deleting}
        onConfirmDelete={onConfirmDelete}
      />
      <AssignSiteUsersDialog
        open={!!assigningSite}
        onOpenChange={(open) => {
          if (!open) setAssigningSite(null)
        }}
        site={assigningSite}
        options={assignOptions}
        optionsLoading={assignOptionsLoading}
        canAssign={canAssign}
        userIds={assignUserIds}
        onUserIdsChange={setAssignUserIds}
        saving={assigning}
        flashError={assignFlashError}
        onSave={() => void onConfirmAssign()}
      />
      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={onBulkDeleteOpenChange}
        count={selectedIds.size}
        itemLabel="site"
        deleting={bulkDeleting}
        onConfirm={onConfirmBulkDelete}
      />

      <SiteFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        siteId={editingSiteId}
        onSuccess={loadData}
        canCreate={canCreate}
        canUpdate={canUpdate}
      />

      <ViewSiteDialog
        open={!!viewingSiteId}
        onOpenChange={(open) => {
          if (!open) setViewingSiteId(null)
        }}
        siteId={viewingSiteId}
        canUpdate={canUpdate}
        canDelete={canDelete}
        onEditClick={(id) => {
          setEditingSiteId(id)
          setFormDialogOpen(true)
        }}
        onDeleteClick={(id) => {
          // If we want to delete from the view dialog, we can just set the deleting site
          const site = data.find((s) => s.id === id)
          if (site) setDeletingSite(site)
        }}
      />
    </div>
  )
}

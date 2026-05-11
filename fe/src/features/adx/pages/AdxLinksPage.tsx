import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { adxApi } from '@/features/adx/api'
import { AdxLinkDialog, AdxDeleteDialog } from '@/features/adx/components'
import {
  EmptyRow,
  MonoText,
  PaginationBar,
  RowActions,
  SOURCE_OPTIONS,
  SortButton,
  StatusPill,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Toolbar,
  type SortState,
} from '@/features/adx/components/AdxShared'
import type {
  AdxGame,
  AdxLink,
  AdxLinkFilterParams,
  AdxLinkOrderBy,
  PaginationMeta,
} from '@/features/adx/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { formatApiError } from '@/features/settings/components'
import { Table } from '@/components/ui/table'

const DEFAULT_PAGE_SIZE = 15

const DEFAULT_FILTERS: AdxLinkFilterParams = {
  page: 1,
  per_page: DEFAULT_PAGE_SIZE,
  keyword: null,
  adx_game_id: null,
  source: null,
  status: null,
  order_by: 'id',
  order: 'desc',
}

const SOURCE_OPTIONS_SELECT = SOURCE_OPTIONS.map((s) => ({ value: s, label: s }))

export function AdxLinksPage() {
  const user = useAuthStore((s) => s.user)
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions])
  const access = useMemo(
    () => ({
      createLink: hasPermission(permissions, PermissionSlugs.AdxLinksCreate),
      updateLink: hasPermission(permissions, PermissionSlugs.AdxLinksUpdate),
      deleteLink: hasPermission(permissions, PermissionSlugs.AdxLinksDelete),
    }),
    [permissions],
  )

  const [games, setGames] = useState<AdxGame[]>([])
  const [items, setItems] = useState<AdxLink[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<AdxLinkFilterParams>(DEFAULT_FILTERS)
  const [refresh, setRefresh] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdxLink | null>(null)
  const [deleting, setDeleting] = useState<AdxLink | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const reload = useCallback(() => setRefresh((v) => v + 1), [])

  useEffect(() => {
    let ignore = false
    adxApi
      .listGames({ page: 1, per_page: 100, status: 'active', order_by: 'sort_order', order: 'asc' })
      .then(({ data }) => { if (!ignore) setGames(data.data) })
      .catch(() => {})
    return () => { ignore = true }
  }, [])

  useEffect(() => {
    let ignore = false
    async function run() {
      try {
        setLoading(true)
        const { data } = await adxApi.listLinks(filters)
        if (!ignore) {
          setItems(data.data)
          setPagination(data.pagination)
        }
      } catch (err) {
        if (!ignore) toast.error(formatApiError(err))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    void run()
    return () => { ignore = true }
  }, [filters, refresh])

  const sort = useMemo<SortState<AdxLinkOrderBy>>(
    () => ({ order_by: filters.order_by ?? null, order: filters.order ?? null }),
    [filters.order, filters.order_by],
  )
  const onSort = useCallback((column: AdxLinkOrderBy) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      order_by: column,
      order: prev.order_by === column && prev.order === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deleting) return
    try {
      setDeleteBusy(true)
      await adxApi.deleteLink(deleting.id)
      toast.success('AdX link deleted successfully')
      setDeleting(null)
      reload()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setDeleteBusy(false)
    }
  }, [deleting, reload])

  const gameOptions = useMemo(
    () => games.map((g) => ({ value: String(g.id), label: g.name })),
    [games],
  )

  const onApplyFilters = useCallback((values: Record<string, unknown>) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      keyword: typeof values.keyword === 'string' && values.keyword ? values.keyword : null,
      adx_game_id:
        typeof values.adx_game_id === 'string' && values.adx_game_id
          ? Number(values.adx_game_id)
          : null,
      source: typeof values.source === 'string' ? values.source : null,
    }))
  }, [])

  const onResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'keyword',
        label: 'Search',
        type: 'input',
        value: filters.keyword ?? null,
        placeholder: 'Search links...',
      },
      {
        field: 'adx_game_id',
        label: 'Game',
        type: 'select',
        value: filters.adx_game_id ? String(filters.adx_game_id) : null,
        options: gameOptions,
        placeholder: 'All games',
      },
      {
        field: 'source',
        label: 'Source',
        type: 'select',
        value: filters.source ?? null,
        options: SOURCE_OPTIONS_SELECT,
        placeholder: 'All sources',
      },
    ],
    [filters, gameOptions],
  )

  return (
    <div className="flex flex-col gap-6">
      <FilterPanel fields={filterFields} onReset={onResetFilters} applyMode onApply={onApplyFilters} />
      <section className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        <Toolbar
          title="Links"
          subtitle="Landing URL templates copied into Google Ads, Facebook Ads, or other traffic sources."
          canCreate={access.createLink}
          createLabel="Create link"
          onCreate={() => setDialogOpen(true)}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton column="name" sort={sort} onSort={onSort}>Name</SortButton>
              </TableHead>
              <TableHead>Game</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <EmptyRow colSpan={6}>Loading links...</EmptyRow>
            ) : items.length === 0 ? (
              <EmptyRow colSpan={6}>No links found.</EmptyRow>
            ) : (
              items.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">{link.name}</TableCell>
                  <TableCell>{link.game?.name ?? '-'}</TableCell>
                  <TableCell><StatusPill value={link.source} /></TableCell>
                  <TableCell><MonoText value={link.slug} /></TableCell>
                  <TableCell><StatusPill value={link.status} /></TableCell>
                  <TableCell>
                    <RowActions
                      row={link}
                      canUpdate={access.updateLink}
                      canDelete={access.deleteLink}
                      onEdit={(row) => { setEditing(row); setDialogOpen(true) }}
                      onDelete={setDeleting}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <PaginationBar
          pagination={pagination}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          onPageSizeChange={(perPage) => setFilters((prev) => ({ ...prev, page: 1, per_page: perPage }))}
        />
      </section>
      <AdxLinkDialog
        open={dialogOpen}
        link={editing}
        games={games}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null) }}
        onSuccess={reload}
      />
      <AdxDeleteDialog
        open={Boolean(deleting)}
        deleting={deleteBusy}
        onOpenChange={(open) => { if (!open) setDeleting(null) }}
        title="Delete AdX Link"
        description={
          <>
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">{deleting?.name}</span>?
          </>
        }
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}

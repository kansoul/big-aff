import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { adxApi } from '@/features/adx/api'
import { AdxGameDialog, AdxDeleteDialog } from '@/features/adx/components'
import {
  DateText,
  EmptyRow,
  MonoText,
  PaginationBar,
  RowActions,
  STATUS_OPTIONS,
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
  AdxGameFilterParams,
  AdxGameOrderBy,
  PaginationMeta,
} from '@/features/adx/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { formatApiError } from '@/features/settings/components'
import { Table } from '@/components/ui/table'

const DEFAULT_PAGE_SIZE = 15

const DEFAULT_FILTERS: AdxGameFilterParams = {
  page: 1,
  per_page: DEFAULT_PAGE_SIZE,
  keyword: null,
  status: null,
  order_by: 'sort_order',
  order: 'asc',
}

const STATUS_OPTIONS_SELECT = STATUS_OPTIONS.map((s) => ({ value: s, label: s }))

export function AdxGamesPage() {
  const user = useAuthStore((s) => s.user)
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions])
  const access = useMemo(
    () => ({
      createGame: hasPermission(permissions, PermissionSlugs.AdxGamesCreate),
      updateGame: hasPermission(permissions, PermissionSlugs.AdxGamesUpdate),
      deleteGame: hasPermission(permissions, PermissionSlugs.AdxGamesDelete),
    }),
    [permissions],
  )

  const [items, setItems] = useState<AdxGame[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<AdxGameFilterParams>(DEFAULT_FILTERS)
  const [refresh, setRefresh] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdxGame | null>(null)
  const [deleting, setDeleting] = useState<AdxGame | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const reload = useCallback(() => setRefresh((v) => v + 1), [])

  useEffect(() => {
    let ignore = false
    async function run() {
      try {
        setLoading(true)
        const { data } = await adxApi.listGames(filters)
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

  const sort = useMemo<SortState<AdxGameOrderBy>>(
    () => ({ order_by: filters.order_by ?? null, order: filters.order ?? null }),
    [filters.order, filters.order_by],
  )
  const onSort = useCallback((column: AdxGameOrderBy) => {
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
      await adxApi.deleteGame(deleting.id)
      toast.success('AdX game deleted successfully')
      setDeleting(null)
      reload()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setDeleteBusy(false)
    }
  }, [deleting, reload])

  const onApplyFilters = useCallback((values: Record<string, unknown>) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      keyword: typeof values.keyword === 'string' && values.keyword ? values.keyword : null,
      status: typeof values.status === 'string' ? values.status : null,
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
        placeholder: 'Search games...',
      },
      {
        field: 'status',
        label: 'Status',
        type: 'select',
        value: filters.status ?? null,
        options: STATUS_OPTIONS_SELECT,
        placeholder: 'All statuses',
      },
    ],
    [filters],
  )

  return (
    <div className="flex flex-col gap-6">
      <FilterPanel fields={filterFields} onReset={onResetFilters} applyMode onApply={onApplyFilters} />
      <section className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        <Toolbar
          title="Games"
          subtitle="Review games available for AdX/GAM link tracking."
          canCreate={access.createGame}
          createLabel="Create game"
          onCreate={() => setDialogOpen(true)}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton column="name" sort={sort} onSort={onSort}>Name</SortButton>
              </TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <SortButton column="sort_order" sort={sort} onSort={onSort}>Sort</SortButton>
              </TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <EmptyRow colSpan={6}>Loading games...</EmptyRow>
            ) : items.length === 0 ? (
              <EmptyRow colSpan={6}>No games found.</EmptyRow>
            ) : (
              items.map((game) => (
                <TableRow key={game.id}>
                  <TableCell className="font-medium">{game.name}</TableCell>
                  <TableCell><MonoText value={game.slug} /></TableCell>
                  <TableCell><StatusPill value={game.status} /></TableCell>
                  <TableCell>{game.sort_order}</TableCell>
                  <TableCell><DateText value={game.updated_at} /></TableCell>
                  <TableCell>
                    <RowActions
                      row={game}
                      canUpdate={access.updateGame}
                      canDelete={access.deleteGame}
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
      <AdxGameDialog
        open={dialogOpen}
        game={editing}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null) }}
        onSuccess={reload}
      />
      <AdxDeleteDialog
        open={Boolean(deleting)}
        deleting={deleteBusy}
        onOpenChange={(open) => { if (!open) setDeleting(null) }}
        title="Delete AdX Game"
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

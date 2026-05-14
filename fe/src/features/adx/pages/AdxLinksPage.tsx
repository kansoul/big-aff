import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { adxApi } from '@/features/adx/api'
import { AdxLinkDialog, AdxDeleteDialog } from '@/features/adx/components'
import {
  EmptyRow,
  MonoText,
  PaginationBar,
  RowActions,
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
  status: null,
  order_by: 'id',
  order: 'desc',
}

type AdxCopyPlatform = 'facebook' | 'google'

function withQueryParams(url: string, params: Record<string, string | number>): string {
  const [beforeHash, hash = ''] = url.split('#')
  const separator = beforeHash.includes('?') ? '&' : '?'
  const query = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${String(value)}`)
    .join('&')

  return `${beforeHash}${separator}${query}${hash ? `#${hash}` : ''}`
}

function buildAdxCopyLink(link: AdxLink, platform: AdxCopyPlatform): string {
  return withQueryParams(link.landing_url, {
    campaign_id: platform === 'google' ? '{campaignid}' : '{{campaign.id}}',
    source_id: link.source_id ?? link.id,
  })
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

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
      .then(({ data }) => {
        if (!ignore) setGames(data.data)
      })
      .catch(() => undefined)
    return () => {
      ignore = true
    }
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
    return () => {
      ignore = true
    }
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
        field: 'status',
        label: 'Status',
        type: 'select',
        value: filters.status ?? null,
        options: [
          { value: 'active', label: 'active' },
          { value: 'inactive', label: 'inactive' },
          { value: 'paused', label: 'paused' },
          { value: 'archived', label: 'archived' },
        ],
        placeholder: 'All statuses',
      },
    ],
    [filters, gameOptions],
  )

  const onCopyLink = useCallback((link: AdxLink, platform: AdxCopyPlatform) => {
    const url = buildAdxCopyLink(link, platform)
    void copyText(url).then(() => {
      toast.success(`Copied ${platform === 'google' ? 'Google' : 'Facebook'} link`)
    })
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <FilterPanel
        fields={filterFields}
        onReset={onResetFilters}
        applyMode
        onApply={onApplyFilters}
      />
      <section className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        <Toolbar
          title="Links"
          subtitle="Reusable landing links with campaign_id and source_id filled for ad platforms."
          canCreate={access.createLink}
          createLabel="Create link"
          onCreate={() => setDialogOpen(true)}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Copy</TableHead>
              <TableHead>Source ID</TableHead>
              <TableHead>
                <SortButton column="name" sort={sort} onSort={onSort}>
                  Name
                </SortButton>
              </TableHead>
              <TableHead>Game</TableHead>
              <TableHead>Landing URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <EmptyRow colSpan={7}>Loading links...</EmptyRow>
            ) : items.length === 0 ? (
              <EmptyRow colSpan={7}>No links found.</EmptyRow>
            ) : (
              items.map((link) => (
                <TableRow key={link.id}>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => onCopyLink(link, 'google')}
                      >
                        <Copy className="size-3" />
                        GG
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => onCopyLink(link, 'facebook')}
                      >
                        <Copy className="size-3" />
                        FB
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <MonoText value={String(link.source_id ?? link.id)} />
                  </TableCell>
                  <TableCell className="font-medium">{link.name}</TableCell>
                  <TableCell>{link.game?.name ?? '-'}</TableCell>
                  <TableCell className="max-w-md">
                    <span className="line-clamp-2 break-all font-mono text-xs text-muted-foreground">
                      {link.landing_url}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusPill value={link.status} />
                  </TableCell>
                  <TableCell>
                    <RowActions
                      row={link}
                      canUpdate={access.updateLink}
                      canDelete={access.deleteLink}
                      onEdit={(row) => {
                        setEditing(row)
                        setDialogOpen(true)
                      }}
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
          onPageSizeChange={(perPage) =>
            setFilters((prev) => ({ ...prev, page: 1, per_page: perPage }))
          }
        />
      </section>
      <AdxLinkDialog
        open={dialogOpen}
        link={editing}
        games={games}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditing(null)
        }}
        onSuccess={reload}
      />
      <AdxDeleteDialog
        open={Boolean(deleting)}
        deleting={deleteBusy}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
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

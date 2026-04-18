import { memo, useMemo, useState } from 'react'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  MRT_ShowHideColumnsButton,
} from 'mantine-react-table'
import { AlertCircle, Copy, Eye, EyeOff, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { StatusBadge } from '@/components/common/StatusBadge'
import type {
  AdsLink,
  AdsLinkFilterParams,
  ChannelOption,
  CopyDialogState,
  PostOption,
  SiteOption,
  UserOption,
} from '@/features/ads-links/types'

const FB_URL_PARAMS = '?campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}&tt=fb'
const GOOGLE_URL_PARAMS = '?campaign_id={campaignid}&adset_id={adgroupid}&ad_id={creative}&tt=gg'

function buildCopyLink(siteUrl: string, slug: string, platform: 'facebook' | 'google'): string {
  const base = siteUrl.replace(/\/$/, '')
  const params = platform === 'facebook' ? FB_URL_PARAMS : GOOGLE_URL_PARAMS
  return `${base}/articles/${slug}${params}`
}

async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

const COPY_DIALOG_CLOSED: CopyDialogState = { open: false, platform: 'facebook', id: '', link: '' }

type CopyLinkDialogProps = {
  state: CopyDialogState
  onClose: () => void
}

function CopyLinkDialog({ state, onClose }: CopyLinkDialogProps) {
  const label = state.platform === 'facebook' ? 'Facebook' : 'Google'

  async function handleCopy() {
    await copyToClipboard(state.link)
    onClose()
    toast.success(`Copied ${label} link successfully!`)
  }

  return (
    <Dialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Copy {label} link</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">{label} ID</label>
            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 font-mono text-xs">
              <span className="flex-1 break-all">
                {Array.isArray(state.id) ? state.id.join(', ') : state.id}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Link for {label}</label>
            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 font-mono text-xs">
              <span className="flex-1 break-all">{state.link}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void handleCopy()}>
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type ActionMeta = {
  currentUserId: number | undefined
  canUpdate: boolean
  onEditRow: (row: AdsLink) => void
  onToggleHide: (row: AdsLink) => void
  onOpenCopyDialog: (state: Omit<CopyDialogState, 'open'>) => void
}

function getColumns(meta: ActionMeta): MRT_ColumnDef<AdsLink>[] {
  const { currentUserId, canUpdate, onEditRow, onToggleHide, onOpenCopyDialog } = meta

  return [
    {
      accessorKey: 'slug',
      header: 'Slug',
      size: 180,
      Cell: ({ row }) => (
        <span className="font-mono text-xs text-foreground">{row.original.slug}</span>
      ),
    },
    {
      accessorKey: 'site',
      header: 'Site',
      size: 140,
      Cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.site?.name ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'post',
      header: 'Post',
      size: 180,
      Cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.post?.title ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'channel_code',
      header: 'Channel',
      size: 100,
      Cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.channel_code ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'style_code',
      header: 'Style',
      size: 80,
      Cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.style_code ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'is_hidden',
      header: 'Status',
      size: 100,
      Cell: ({ row }) => (
        <StatusBadge
          status={row.original.is_hidden ? 'hidden' : 'active'}
          label={row.original.is_hidden ? 'Hidden' : 'Active'}
        />
      ),
    },
    {
      id: 'copy_links',
      header: 'Copy Link',
      size: 120,
      enableSorting: false,
      enableGlobalFilter: false,
      Cell: ({ row }) => {
        const link = row.original
        const siteUrl = link.site?.url
        if (!siteUrl) return null

        return (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              title="Copy Facebook link"
              onClick={() =>
                onOpenCopyDialog({
                  platform: 'facebook',
                  id: link.fbid ? link.fbid.join(',') : '',
                  link: buildCopyLink(siteUrl, link.slug, 'facebook'),
                })
              }
            >
              <Copy className="h-3 w-3 mr-1" />
              FB
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              title="Copy Google link"
              onClick={() =>
                onOpenCopyDialog({
                  platform: 'google',
                  id: link.googleid ? link.googleid.join(',') : '',
                  link: buildCopyLink(siteUrl, link.slug, 'google'),
                })
              }
            >
              <Copy className="h-3 w-3 mr-1" />
              GG
            </Button>
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 100,
      enableSorting: false,
      enableGlobalFilter: false,
      enableHiding: false,
      mantineTableHeadCellProps: {
        sx: { '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
      },
      Cell: ({ row }: { row: { original: AdsLink } }) => {
        const link = row.original
        const isOwner = link.created_by === currentUserId

        return (
          <div className="flex justify-end gap-0.5">
            {canUpdate && isOwner ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="Edit"
                onClick={() => onEditRow(link)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            {isOwner ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label={link.is_hidden ? 'Show' : 'Hide'}
                onClick={() => onToggleHide(link)}
              >
                {link.is_hidden ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
              </Button>
            ) : null}
          </div>
        )
      },
    },
  ]
}

type AdsLinksTableCardProps = {
  listError: string | null
  loading: boolean
  adsLinks: AdsLink[]
  totalRows: number
  currentUserId: number | undefined
  canCreate: boolean
  canUpdate: boolean
  filters: AdsLinkFilterParams
  sites: SiteOption[]
  posts: PostOption[]
  channels: ChannelOption[]
  users: UserOption[]
  onFilterChange: (patch: Partial<AdsLinkFilterParams>) => void
  onFilterReset: () => void
  onAddClick: () => void
  onEditRow: (row: AdsLink) => void
  onToggleHide: (row: AdsLink) => void
  onPaginationChange: (page: number, perPage: number) => void
  onSortingChange: (orderBy: string | null, order: 'asc' | 'desc' | null) => void
}

function AdsLinksTableCardInner({
  listError,
  loading,
  adsLinks,
  totalRows,
  currentUserId,
  canCreate,
  canUpdate,
  filters,
  sites,
  posts,
  channels,
  users,
  onFilterChange,
  onFilterReset,
  onAddClick,
  onEditRow,
  onToggleHide,
  onPaginationChange,
  onSortingChange,
}: AdsLinksTableCardProps) {
  const [copyDialog, setCopyDialog] = useState<CopyDialogState>(COPY_DIALOG_CLOSED)

  const columns = useMemo(
    () =>
      getColumns({
        currentUserId,
        canUpdate,
        onEditRow,
        onToggleHide,
        onOpenCopyDialog: (state) => setCopyDialog({ ...state, open: true }),
      }),
    [currentUserId, canUpdate, onEditRow, onToggleHide],
  )

  // Build filter field definitions for FilterPanel
  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'post_id',
        label: 'Post',
        type: 'select',
        value: filters.post_id ? String(filters.post_id) : null,
        options: posts.map((p) => ({ label: p.title, value: String(p.id) })),
      },
      {
        field: 'site_id',
        label: 'Site',
        type: 'select',
        value: filters.site_id ? String(filters.site_id) : null,
        options: sites.map((s) => ({ label: s.name, value: String(s.id) })),
      },
      {
        field: 'channel_code',
        label: 'Channel',
        type: 'select',
        value: filters.channel_code ?? null,
        options: channels.map((c) => ({ label: c.name, value: c.code })),
      },
      {
        field: 'is_hidden',
        label: 'Status',
        type: 'select',
        placeholder: 'All',
        value:
          filters.is_hidden == 1 || filters.is_hidden === true
            ? '1'
            : filters.is_hidden == 0 || filters.is_hidden === false
              ? '0'
              : '__all__',
        options: [
          { label: 'Active', value: '0' },
          { label: 'Hidden', value: '1' },
        ],
      },
      {
        field: 'date_range',
        label: 'Created date',
        type: 'daterange',
        value: filters.date_range ?? null,
      },
      {
        field: 'created_by',
        label: 'Created by',
        type: 'select',
        value: filters.created_by ? String(filters.created_by) : null,
        options: users.map((u) => ({ label: u.name, value: String(u.id) })),
      },
      {
        field: 'pixel_id',
        label: 'Facebook Pixel ID',
        type: 'input',
        value: filters.pixel_id ?? null,
        placeholder: 'Search Pixel ID…',
      },
      {
        field: 'googleid',
        label: 'Google ID',
        type: 'input',
        value: filters.googleid ?? null,
        placeholder: 'Search Google ID…',
      },
    ],
    [filters, posts, sites, channels, users],
  )

  const table = useMantineReactTable({
    data: adsLinks,
    columns,
    enableColumnFilters: false,
    enableGlobalFilter: true,
    positionGlobalFilter: 'left',
    initialState: {
      showGlobalFilter: true,
      density: 'md',
    },
    // Server-side pagination
    manualPagination: true,
    rowCount: totalRows,
    state: {
      showLoadingOverlay: loading,
      pagination: {
        pageIndex: (filters.page ?? 1) - 1,
        pageSize: filters.per_page ?? 15,
      },
      sorting: filters.order_by ? [{ id: filters.order_by, desc: filters.order === 'desc' }] : [],
    },
    onPaginationChange: (updater) => {
      const current = { pageIndex: (filters.page ?? 1) - 1, pageSize: filters.per_page ?? 15 }
      const next = typeof updater === 'function' ? updater(current) : updater
      onPaginationChange(next.pageIndex + 1, next.pageSize)
    },
    // Server-side sorting
    manualSorting: true,
    onSortingChange: (updater) => {
      const current = filters.order_by
        ? [{ id: filters.order_by, desc: filters.order === 'desc' }]
        : []
      const next = typeof updater === 'function' ? updater(current) : updater
      if (next.length === 0) {
        onSortingChange(null, null)
      } else {
        onSortingChange(next[0].id, next[0].desc ? 'desc' : 'asc')
      }
    },
    enablePagination: true,
    paginationDisplayMode: 'pages',
    enableFullScreenToggle: false,
    mantineTableContainerProps: { sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } },
    localization: { rowsPerPage: 'Per Page' },
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-14 text-center">
        <p className="text-sm text-muted-foreground">No ads links found.</p>
      </div>
    ),
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full flex-col gap-4 rounded-md border bg-muted/20 p-4">
        {/* Action buttons */}
        <div className="flex w-full items-center justify-end gap-2">
          {canCreate && (
            <>
              <Button
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs font-semibold tracking-wide"
                onClick={onAddClick}
              >
                <Plus className="h-3.5 w-3.5" />
                New Link
              </Button>
              <div className="mx-1 h-5 w-px bg-border" />
            </>
          )}
          <MRT_ShowHideColumnsButton table={t} />
        </div>
        <FilterPanel
          fields={filterFields}
          onReset={onFilterReset}
          applyMode
          onApply={onFilterChange}
        />
      </div>
    ),
  })

  return (
    <>
      {listError ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{listError}</p>
        </div>
      ) : null}
      <MantineReactTable table={table} />
      <CopyLinkDialog state={copyDialog} onClose={() => setCopyDialog(COPY_DIALOG_CLOSED)} />
    </>
  )
}

export const AdsLinksTableCard = memo(AdsLinksTableCardInner)

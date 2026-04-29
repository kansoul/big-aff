import { memo, useMemo, useState } from 'react'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  MRT_ShowHideColumnsButton,
} from 'mantine-react-table'
import { AlertCircle, Copy, Eye, EyeOff, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { ActiveFilterChips, type ActiveFilterChip } from '@/components/common/ActiveFilterChips'
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

import { buildCopyLink } from '@/lib/ads-link'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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
      accessorKey: 'id',
      header: 'ID',
      size: 65,
      Cell: ({ row }) => (
        <span className="font-mono text-[11px] text-muted-foreground">#{row.original.id}</span>
      ),
    },
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
      Cell: ({ row }) => {
        const name = row.original.site?.name
        if (!name) return <span className="text-muted-foreground">—</span>
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate block text-muted-foreground max-w-full">{name}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs wrap-break-word text-xs">
                {name}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
    },
    {
      accessorKey: 'post',
      header: 'Post',
      size: 180,
      Cell: ({ row }) => {
        const title = row.original.post?.title
        if (!title) return <span className="text-muted-foreground">—</span>
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="truncate block text-muted-foreground max-w-full">{title}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs wrap-break-word text-xs">
                {title}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
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
    ...(canUpdate
      ? [
          {
            id: 'actions',
            header: 'Actions',
            size: 150,
            enableSorting: false,
            enableGlobalFilter: false,
            enableHiding: false,
            mantineTableHeadCellProps: {
              sx: { '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
            },
            Cell: ({ row }: { row: { original: AdsLink } }) => {
              const link = row.original
              const isOwner = link.created_by === currentUserId
              if (!isOwner) return null

              return (
                <TooltipProvider>
                  <div className="flex justify-end gap-0.5">
                    {canUpdate ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                            aria-label="Edit"
                            onClick={() => onEditRow(link)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Edit
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                          aria-label={link.is_hidden ? 'Show' : 'Hide'}
                          onClick={() => onToggleHide(link)}
                        >
                          {link.is_hidden ? (
                            <Eye className="h-3.5 w-3.5" />
                          ) : (
                            <EyeOff className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {link.is_hidden ? 'Show' : 'Hide'}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              )
            },
          } satisfies MRT_ColumnDef<AdsLink>,
        ]
      : []),
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

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []

    if (filters.post_id) {
      const opt = posts.find((post) => post.id === filters.post_id)
      chips.push({
        key: 'post_id',
        label: 'Post',
        displayValue: opt?.title ?? String(filters.post_id),
      })
    }
    if (filters.site_id) {
      const opt = sites.find((site) => site.id === filters.site_id)
      chips.push({
        key: 'site_id',
        label: 'Site',
        displayValue: opt?.name ?? String(filters.site_id),
      })
    }
    if (filters.channel_code) {
      const opt = channels.find((channel) => channel.code === filters.channel_code)
      chips.push({
        key: 'channel_code',
        label: 'Channel',
        displayValue: opt?.name ?? filters.channel_code,
      })
    }
    if (filters.is_hidden === 0 || filters.is_hidden === 1) {
      chips.push({
        key: 'is_hidden',
        label: 'Status',
        displayValue: filters.is_hidden === 1 ? 'Hidden' : 'Active',
      })
    }
    if (filters.date_range?.from || filters.date_range?.to) {
      chips.push({
        key: 'date_range',
        label: 'Created date',
        displayValue: `${filters.date_range?.from ?? '…'} -> ${filters.date_range?.to ?? '…'}`,
      })
    }
    if (filters.created_by) {
      const opt = users.find((user) => user.id === filters.created_by)
      chips.push({
        key: 'created_by',
        label: 'Created by',
        displayValue: opt?.name ?? String(filters.created_by),
      })
    }
    if (filters.pixel_id) {
      chips.push({
        key: 'pixel_id',
        label: 'Facebook Pixel ID',
        displayValue: filters.pixel_id,
      })
    }
    if (filters.googleid) {
      chips.push({ key: 'googleid', label: 'Google ID', displayValue: filters.googleid })
    }

    return chips
  }, [filters, posts, sites, channels, users])

  function handleRemoveChip(key: string) {
    if (key === 'date_range') {
      onFilterChange({ date_range: null })
    } else if (key === 'is_hidden') {
      onFilterChange({ is_hidden: null })
    } else {
      onFilterChange({ [key]: null } as Partial<AdsLinkFilterParams>)
    }
  }

  const table = useMantineReactTable({
    data: adsLinks,
    columns,
    enableColumnFilters: false,
    enableGlobalFilter: true,
    positionGlobalFilter: 'left',
    initialState: {
      showGlobalFilter: true,
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
    mantineLoadingOverlayProps: {
      sx: { transform: 'translateX(var(--mrt-scroll-left, 0px))' },
    },
    mantineTableContainerProps: {
      onScroll: (e: React.UIEvent<HTMLDivElement>) => {
        e.currentTarget.style.setProperty('--mrt-scroll-left', `${e.currentTarget.scrollLeft}px`)
      },
      sx: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
    },
    localization: { rowsPerPage: 'Per Page' },
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <AlertCircle className="h-5 w-5 text-muted-foreground/50" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">No ads links found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your filters or create a new link.
          </p>
        </div>
      </div>
    ),
    renderTopToolbar: ({ table: t }) => (
      <div className="flex w-full flex-col border-b border-border bg-card">
        <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">Ads Links</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {totalRows.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {canCreate && (
              <Button
                size="sm"
                className="h-7 gap-1.5 px-2.5 text-xs font-medium"
                onClick={onAddClick}
              >
                <Plus className="h-3.5 w-3.5" />
                New Link
              </Button>
            )}
            {canCreate && <div className="h-4 w-px bg-border" />}
            <MRT_ShowHideColumnsButton table={t} />
          </div>
        </div>
        <div className="border-t border-border/60 px-4 py-3">
          <FilterPanel
            fields={filterFields}
            onReset={onFilterReset}
            applyMode
            onApply={onFilterChange}
          />
        </div>
        <ActiveFilterChips
          chips={activeChips}
          onRemove={handleRemoveChip}
          onClearAll={onFilterReset}
        />
      </div>
    ),
    enableRowSelection: false,
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

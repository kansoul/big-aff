import { memo, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
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
  CopyDialogState,
  SiteOption,
  UserOption,
} from '@/features/ads-links/types'

import { useColumnVisibilityStorage } from '@/hooks/useColumnVisibilityStorage'
import { buildCopyLink } from '@/lib/ads-link'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { RBACRole } from '@/shared/types'

async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

const COPY_DIALOG_CLOSED: CopyDialogState = { open: false, platform: 'google', id: '', link: '' }

type CopyLinkDialogProps = {
  state: CopyDialogState
  onClose: () => void
}

const COPY_PLATFORM_LABELS: Record<CopyDialogState['platform'], string> = {
  google: 'Google',
  tiktok: 'TikTok',
}

function CopyLinkDialog({ state, onClose }: CopyLinkDialogProps) {
  const label = COPY_PLATFORM_LABELS[state.platform]

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
          {state.platform === 'tiktok' ? (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">TikTok Pixel ID</label>
              <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 font-mono text-xs">
                <span className="flex-1 break-all">
                  {Array.isArray(state.pixelId) ? state.pixelId.join(', ') : state.pixelId || '—'}
                </span>
              </div>
            </div>
          ) : null}
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
  canUpdate: boolean
  users: UserOption[]
  onEditRow: (row: AdsLink) => void
  onToggleHide: (row: AdsLink) => void
  onOpenCopyDialog: (state: Omit<CopyDialogState, 'open'>) => void
  role: RBACRole
}

function getColumns(meta: ActionMeta): MRT_ColumnDef<AdsLink>[] {
  const { canUpdate, users, onEditRow, onToggleHide, onOpenCopyDialog, role } = meta

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
              title="Copy Google link"
              disabled={!link.googleid?.length}
              onClick={() =>
                onOpenCopyDialog({
                  platform: 'google',
                  id: link.googleid ? link.googleid.join(',') : '',
                  link: buildCopyLink(siteUrl, link.slug, link.tracking_code, 'google'),
                })
              }
            >
              <Copy className="h-3 w-3 mr-1" />
              GG
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              title="Copy TikTok link"
              disabled={!link.tiktokid?.length || !link.tiktok_pixel_id?.length}
              onClick={() =>
                onOpenCopyDialog({
                  platform: 'tiktok',
                  id: link.tiktokid ? link.tiktokid.join(',') : '',
                  pixelId: link.tiktok_pixel_id ?? [],
                  link: buildCopyLink(siteUrl, link.slug, link.tracking_code, 'tiktok'),
                })
              }
            >
              <Copy className="h-3 w-3 mr-1" />
              TT
            </Button>
          </div>
        )
      },
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
      accessorKey: 'rac',
      header: 'RAC',
      size: 100,
      Cell: ({ row }) => {
        const rac = row.original.rac
        if (!rac) return <span className="text-muted-foreground">—</span>
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                asChild
                onClick={(e) => {
                  e.stopPropagation()
                  void navigator.clipboard.writeText(rac).then(() => {
                    toast.success('Copied to clipboard')
                  })
                }}
              >
                <span className="font-mono text-xs text-primary cursor-pointer whitespace-pre-wrap line-clamp-3 wrap-break-word">
                  {rac}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs wrap-break-word text-xs">
                {rac}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
    },
    {
      accessorKey: 'note',
      header: 'Note',
      size: 180,
      Cell: ({ row }) => {
        const note = row.original.note
        if (!note) return <span className="text-muted-foreground">—</span>
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-foreground line-clamp-2 cursor-default">{note}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs wrap-break-word text-xs">
                {note}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
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
      accessorKey: 'created_at',
      header: 'Created at',
      size: 120,
      Cell: ({ row }) => {
        const val = row.original.created_at
        if (!val) return <span className="text-muted-foreground">—</span>
        const d = new Date(val)
        return (
          <span className="text-xs text-muted-foreground">
            {d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        )
      },
    },
    ...(!role.isMember
      ? [
          {
            accessorKey: 'created_by',
            header: 'Created by',
            size: 130,
            Cell: ({ row }) => {
              const id = row.original.created_by
              if (!id) return <span className="text-muted-foreground">—</span>
              const user = users.find((u) => u.id === id)
              return <span className="text-xs text-foreground">{user?.name ?? String(id)}</span>
            },
          } satisfies MRT_ColumnDef<AdsLink>,
        ]
      : []),
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
  canCreate: boolean
  canUpdate: boolean
  filters: AdsLinkFilterParams
  sites: SiteOption[]
  users: UserOption[]
  onFilterChange: (patch: Partial<AdsLinkFilterParams>) => void
  onFilterReset: () => void
  onAddClick: () => void
  onEditRow: (row: AdsLink) => void
  onToggleHide: (row: AdsLink) => void
  onPaginationChange: (page: number, perPage: number) => void
  onSortingChange: (orderBy: string | null, order: 'asc' | 'desc' | null) => void
  role: RBACRole
}

function AdsLinksTableCardInner({
  listError,
  loading,
  adsLinks,
  totalRows,
  canCreate,
  canUpdate,
  filters,
  sites,
  users,
  onFilterChange,
  onFilterReset,
  onAddClick,
  onEditRow,
  onToggleHide,
  onPaginationChange,
  onSortingChange,
  role,
}: AdsLinksTableCardProps) {
  const [copyDialog, setCopyDialog] = useState<CopyDialogState>(COPY_DIALOG_CLOSED)

  const { columnVisibility, setColumnVisibility } = useColumnVisibilityStorage(
    useLocation().pathname,
  )

  const columns = useMemo(
    () =>
      getColumns({
        canUpdate,
        users,
        onEditRow,
        onToggleHide,
        onOpenCopyDialog: (state) => setCopyDialog({ ...state, open: true }),
        role,
      }),
    [canUpdate, users, onEditRow, onToggleHide, role],
  )

  // Build filter field definitions for FilterPanel
  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'site_id',
        label: 'Site',
        type: 'select',
        value: filters.site_id ? String(filters.site_id) : null,
        options: sites.map((s) => ({ label: s.name, value: String(s.id) })),
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
        hidden: role.isMember,
        value: filters.created_by ? String(filters.created_by) : null,
        options: users.map((u) => ({ label: u.name, value: String(u.id) })),
      },
      {
        field: 'googleid',
        label: 'Google ID',
        type: 'input',
        value: filters.googleid ?? null,
        placeholder: 'Search Google ID…',
      },
      {
        field: 'tiktokid',
        label: 'TikTok Advertiser ID',
        type: 'input',
        value: filters.tiktokid ?? null,
        placeholder: 'Search TikTok Advertiser ID…',
      },
      {
        field: 'pixel_id',
        label: 'TikTok Pixel ID',
        type: 'input',
        value: filters.pixel_id ?? null,
        placeholder: 'Search TikTok Pixel ID…',
      },
      {
        field: 'note',
        label: 'Note',
        type: 'input',
        value: filters.note ?? null,
        placeholder: 'Search note…',
      },
      {
        field: 'url',
        label: 'URL / Slug',
        type: 'input',
        value: filters.url ?? null,
        placeholder: 'Paste URL or type slug…',
      },
    ],
    [filters, sites, users, role],
  )

  const activeChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = []

    if (filters.site_id) {
      const opt = sites.find((site) => site.id === filters.site_id)
      chips.push({
        key: 'site_id',
        label: 'Site',
        displayValue: opt?.name ?? String(filters.site_id),
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
    if (filters.created_by && !role.isMember) {
      const opt = users.find((user) => user.id === filters.created_by)
      chips.push({
        key: 'created_by',
        label: 'Created by',
        displayValue: opt?.name ?? String(filters.created_by),
      })
    }
    if (filters.googleid) {
      chips.push({ key: 'googleid', label: 'Google ID', displayValue: filters.googleid })
    }
    if (filters.tiktokid) {
      chips.push({
        key: 'tiktokid',
        label: 'TikTok Advertiser ID',
        displayValue: filters.tiktokid,
      })
    }
    if (filters.pixel_id) {
      chips.push({ key: 'pixel_id', label: 'TikTok Pixel ID', displayValue: filters.pixel_id })
    }
    if (filters.note) {
      chips.push({ key: 'note', label: 'Note', displayValue: filters.note })
    }
    if (filters.url) {
      chips.push({ key: 'url', label: 'URL / Slug', displayValue: filters.url })
    }

    return chips
  }, [filters, sites, users, role])

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
      columnVisibility,
    },
    onColumnVisibilityChange: setColumnVisibility,
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

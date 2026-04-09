import { memo, useMemo, useState } from 'react'
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
  MRT_ShowHideColumnsButton,
  MRT_ToggleGlobalFilterButton,
} from 'mantine-react-table'
import { AlertCircle, Copy, Eye, EyeOff, Pencil, Plus, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type {
  AdsLink,
  AdsLinkFilterParams,
  ChannelOption,
  CopyDialogState,
  PostOption,
  SiteOption,
  UserOption,
} from '@/features/ads-links/types'

const FB_URL_PARAMS = '?campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}'
const GOOGLE_URL_PARAMS = '?campaign_id={campaignid}&adset_id={adgroupid}&ad_id={creative}'

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
      size: 80,
      Cell: ({ row }) =>
        row.original.is_hidden ? (
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
            Hidden
          </span>
        ) : (
          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            Active
          </span>
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
}

function AdsLinksTableCardInner({
  listError,
  loading,
  adsLinks,
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
    state: { showLoadingOverlay: loading },
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
        {/* --- DÒNG TRÊN CÙNG: Các Action Buttons căn phải --- */}
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
          <MRT_ToggleGlobalFilterButton table={t} />
          <MRT_ShowHideColumnsButton table={t} />
        </div>

        {/* --- KHU VỰC FILTER --- */}
        <div className="flex flex-col gap-4 rounded-lg border bg-background/60 p-4 shadow-sm">
          {/* Header & Nút Reset */}
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Filters
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={onFilterReset}
            >
              <RotateCcw className="h-3 w-3" />
              Reset Filters
            </Button>
          </div>

          {/* Lưới các trường Filter */}
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Post */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Post</label>
              <Select
                value={filters.post_id ? String(filters.post_id) : '__all__'}
                onValueChange={(v) =>
                  onFilterChange({ post_id: v === '__all__' ? null : Number(v) })
                }
              >
                {/* Thêm w-full vào đây */}
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  {posts.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Site */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Site</label>
              <Select
                value={filters.site_id ? String(filters.site_id) : '__all__'}
                onValueChange={(v) =>
                  onFilterChange({ site_id: v === '__all__' ? null : Number(v) })
                }
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Channel */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Channel</label>
              <Select
                value={filters.channel_code ?? '__all__'}
                onValueChange={(v) => onFilterChange({ channel_code: v === '__all__' ? null : v })}
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  {channels.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Visible/Hidden */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select
                value={
                  filters.is_hidden === 1 || filters.is_hidden === true
                    ? 'hidden'
                    : filters.is_hidden === 0 || filters.is_hidden === false
                      ? 'visible'
                      : '__all__'
                }
                onValueChange={(v) =>
                  onFilterChange({
                    is_hidden: v === '__all__' ? undefined : v === 'hidden' ? 1 : 0,
                  })
                }
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="visible">Visible</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date from */}
            <div className="flex w-full flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Created date</label>
              <DatePicker
                className="w-full"
                value={filters.date_from ?? null}
                onChange={(v) => onFilterChange({ date_from: v })}
                placeholder="From date"
              />
            </div>

            {/* Created by */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Created by</label>
              <Select
                value={filters.created_by ? String(filters.created_by) : '__all__'}
                onValueChange={(v) =>
                  onFilterChange({ created_by: v === '__all__' ? null : Number(v) })
                }
              >
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Facebook Pixel ID */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Facebook Pixel ID</label>
              <Input
                className="h-8 w-full text-xs"
                placeholder="Search Pixel ID…"
                value={filters.pixel_id ?? ''}
                onChange={(e) => onFilterChange({ pixel_id: e.target.value || null })}
              />
            </div>

            {/* Google ID */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Google ID</label>
              <Input
                className="h-8 w-full text-xs"
                placeholder="Search Google ID…"
                value={filters.googleid ?? ''}
                onChange={(e) => onFilterChange({ googleid: e.target.value || null })}
              />
            </div>
          </div>
        </div>
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

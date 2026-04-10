import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MantineReactTable, useMantineReactTable, type MRT_ColumnDef } from 'mantine-react-table'
import { AlertCircle, Loader2, Pencil, Plus, Search, Tags, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import type { KeywordSet } from '@/features/posts/types'
import { keywordSetsApi } from '@/features/posts/api/keywordSetsApi'
import { formatApiError } from '@/features/settings/components'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { KeywordSetEditDialog } from './KeywordSetEditDialog'
import { TagInput } from './TagInput'

type Tab = 'select' | 'create'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultSelectedItems: KeywordSet[]
  onConfirm: (items: KeywordSet[]) => void
}

export function KeywordSetPickerDialog({
  open,
  onOpenChange,
  defaultSelectedItems,
  onConfirm,
}: Props) {
  const [tab, setTab] = useState<Tab>('select')

  // — Select tab state —
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10
  const [data, setData] = useState<KeywordSet[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<KeywordSet[]>([])

  // — Delete state —
  const [deleteTarget, setDeleteTarget] = useState<KeywordSet | null>(null)
  const [deleting, setDeleting] = useState(false)

  // — Edit state —
  const [editTarget, setEditTarget] = useState<KeywordSet | null>(null)

  // — Create tab state —
  const [createName, setCreateName] = useState('')
  const [createKeywords, setCreateKeywords] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Reset state when dialog opens
  const defaultSelectedRef = useRef(defaultSelectedItems)
  useEffect(() => {
    if (open) {
      defaultSelectedRef.current = defaultSelectedItems
      setSelectedItems(defaultSelectedItems)
      setTab('select')
      setSearchInput('')
      setDebouncedSearch('')
      setPage(1)
      setCreateName('')
      setCreateKeywords([])
      setCreateError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Fetch keyword sets
  const loadData = useCallback(async () => {
    if (!open) return
    setLoading(true)
    try {
      const res = await keywordSetsApi.list({
        keyword: debouncedSearch || null,
        page,
        per_page: perPage,
        order_by: 'created_at',
        order: 'desc',
      })
      setData(res.data.data)
      setTotalCount(res.data.pagination.total)
    } catch {
      // silent — table will show empty state
    } finally {
      setLoading(false)
    }
  }, [open, debouncedSearch, page])

  useEffect(() => {
    void loadData()
  }, [loadData])

  // Toggle selection of a keyword set
  const toggleItem = useCallback((item: KeywordSet) => {
    setSelectedItems((prev) => {
      const exists = prev.some((i) => i.id === item.id)
      return exists ? prev.filter((i) => i.id !== item.id) : [...prev, item]
    })
  }, [])

  // Handle delete
  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      await keywordSetsApi.remove(deleteTarget.id)
      toast.success('Keyword set deleted')
      setDeleteTarget(null)
      // Remove from selection if selected
      setSelectedItems((prev) => prev.filter((i) => i.id !== deleteTarget.id))
      // Refresh list
      await loadData()
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  // Handle edit success
  const handleEditSuccess = useCallback((updated: KeywordSet) => {
    setData((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    setSelectedItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
  }, [])

  // Handle create
  const handleCreate = async () => {
    if (!createName.trim()) return
    try {
      setCreateError(null)
      setCreating(true)
      const res = await keywordSetsApi.create({
        name: createName.trim(),
        keywords: createKeywords.length > 0 ? createKeywords : null,
      })
      const created = res.data.data
      toast.success('Keyword set created')
      // Auto-select the new item and switch to select tab
      setSelectedItems((prev) => [...prev, created])
      setCreateName('')
      setCreateKeywords([])
      // setTab('select')
      setPage(1)
      setDebouncedSearch('')
      setSearchInput('')
      await loadData()
    } catch (err) {
      setCreateError(formatApiError(err))
    } finally {
      setCreating(false)
    }
  }

  const columns = useMemo<MRT_ColumnDef<KeywordSet>[]>(
    () => [
      {
        id: 'select',
        header: '',
        size: 48,
        enableSorting: false,
        enableHiding: false,
        mantineTableHeadCellProps: { style: { width: 48, paddingRight: 0 } },
        mantineTableBodyCellProps: { style: { width: 48, paddingRight: 0 } },
        Cell: ({ row }) => {
          const isSelected = selectedItems.some((i) => i.id === row.original.id)
          return (
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => toggleItem(row.original)}
              aria-label={`Select ${row.original.name}`}
            />
          )
        },
      },
      {
        accessorKey: 'name',
        header: 'Name',
        Cell: ({ row }) => (
          <div className="space-y-1 py-0.5">
            <span className="font-medium text-foreground">{row.original.name}</span>
            {row.original.keywords && row.original.keywords.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {row.original.keywords.slice(0, 6).map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {kw}
                  </span>
                ))}
                {row.original.keywords.length > 6 ? (
                  <span className="text-xs text-muted-foreground">
                    +{row.original.keywords.length - 6} more
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground/50">No keywords</span>
            )}
          </div>
        ),
      },
      {
        id: 'actions',
        header: 'Action',
        size: 80,
        enableSorting: false,
        enableHiding: false,
        mantineTableHeadCellProps: {
          sx: { width: 80, '& .mantine-TableHeadCell-Content': { justifyContent: 'flex-end' } },
        },
        mantineTableBodyCellProps: { style: { width: 80 } },
        Cell: ({ row }) => (
          <div className="flex justify-end gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                setEditTarget(row.original)
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                setDeleteTarget(row.original)
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [selectedItems, toggleItem],
  )

  const table = useMantineReactTable({
    data,
    columns,
    enableColumnFilters: false,
    enableGlobalFilter: false,
    enableSorting: false,
    enableFullScreenToggle: false,
    enableColumnPinning: true,
    enableTopToolbar: false,
    enableBottomToolbar: true,
    manualPagination: true,
    rowCount: totalCount,
    state: {
      pagination: { pageIndex: page - 1, pageSize: perPage },
      showLoadingOverlay: loading,
      columnPinning: { right: ['actions'] },
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: page - 1, pageSize: perPage })
          : updater
      setPage(next.pageIndex + 1)
    },
    paginationDisplayMode: 'pages',
    initialState: { density: 'xs' },
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: () => toggleItem(row.original),
      style: { cursor: 'pointer' },
    }),
    mantineTableContainerProps: { sx: { maxHeight: '280px', overflowX: 'auto' } },
    mantineBottomToolbarProps: { sx: { '& .mantine-Select-root': { display: 'none' } } },
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Tags className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No keyword sets found.</p>
      </div>
    ),
  })

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Keyword Sets</DialogTitle>
          </DialogHeader>

          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
            <TabsList className="w-full">
              <TabsTrigger value="select" className="flex-1">
                Select keyword sets
              </TabsTrigger>
              <TabsTrigger value="create" className="flex-1">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Create new
              </TabsTrigger>
            </TabsList>

            {/* ── Select tab ── */}
            <TabsContent value="select" className="mt-3 space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search keyword sets…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-8"
                />
              </div>

              <div className="overflow-hidden rounded-md border border-border">
                <MantineReactTable table={table} />
              </div>

              {selectedItems.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {selectedItems.length} bộ keyword đã chọn
                </p>
              ) : null}
            </TabsContent>

            {/* ── Create tab ── */}
            <TabsContent value="create" className="mt-3 space-y-4">
              <div className="space-y-1.5">
                <Label>
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Keyword set name"
                  disabled={creating}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Keywords</Label>
                <TagInput
                  value={createKeywords}
                  onChange={setCreateKeywords}
                  placeholder="Type keyword and press Enter…"
                  disabled={creating}
                />
                <p className="text-xs text-muted-foreground">
                  Press Enter or comma to add a keyword.
                </p>
              </div>

              {createError ? (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{createError}</p>
                </div>
              ) : null}

              <div className="flex justify-end">
                <Button
                  onClick={() => void handleCreate()}
                  disabled={creating || !createName.trim()}
                  className="gap-1.5"
                >
                  {creating ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      <Plus className="size-3.5" />
                      Create keyword set
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onConfirm(selectedItems)} className="gap-1.5">
              Confirm ({selectedItems.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      {editTarget ? (
        <KeywordSetEditDialog
          open={!!editTarget}
          onOpenChange={(v) => {
            if (!v) setEditTarget(null)
          }}
          item={editTarget}
          onSuccess={handleEditSuccess}
        />
      ) : null}

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Keyword Set</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">{deleteTarget?.name}</span>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={deleting} onClick={() => void handleDelete()}>
              {deleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  Delete
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

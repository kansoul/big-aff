import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { adxApi } from '@/features/adx/api'
import { AdxAccountConversionDialog, AdxDeleteDialog } from '@/features/adx/components'
import {
  CONVERSION_TYPE_OPTIONS,
  EmptyRow,
  HumanText,
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
  AdxAccountConversion,
  AdxAccountConversionFilterParams,
  AdxAccountConversionOrderBy,
  PaginationMeta,
} from '@/features/adx/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { formatApiError } from '@/features/settings/components'
import { Table } from '@/components/ui/table'

const DEFAULT_PAGE_SIZE = 15

const DEFAULT_FILTERS: AdxAccountConversionFilterParams = {
  page: 1,
  per_page: DEFAULT_PAGE_SIZE,
  source: null,
  account_id: null,
  conversion_type: null,
  status: null,
  order_by: 'id',
  order: 'desc',
}

const SOURCE_OPTIONS_SELECT = SOURCE_OPTIONS.map((s) => ({ value: s, label: s }))
const CONVERSION_TYPE_OPTIONS_SELECT = CONVERSION_TYPE_OPTIONS.map((t) => ({
  value: t,
  label: t.replaceAll('_', ' '),
}))

export function AdxAccountConversionsPage() {
  const user = useAuthStore((s) => s.user)
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions])
  const access = useMemo(
    () => ({
      createConversion: hasPermission(permissions, PermissionSlugs.AdxAccountConversionsCreate),
      updateConversion: hasPermission(permissions, PermissionSlugs.AdxAccountConversionsUpdate),
      deleteConversion: hasPermission(permissions, PermissionSlugs.AdxAccountConversionsDelete),
    }),
    [permissions],
  )

  const [items, setItems] = useState<AdxAccountConversion[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<AdxAccountConversionFilterParams>(DEFAULT_FILTERS)
  const [refresh, setRefresh] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdxAccountConversion | null>(null)
  const [deleting, setDeleting] = useState<AdxAccountConversion | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const reload = useCallback(() => setRefresh((v) => v + 1), [])

  useEffect(() => {
    let ignore = false
    async function run() {
      try {
        setLoading(true)
        const { data } = await adxApi.listAccountConversions(filters)
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

  const sort = useMemo<SortState<AdxAccountConversionOrderBy>>(
    () => ({ order_by: filters.order_by ?? null, order: filters.order ?? null }),
    [filters.order, filters.order_by],
  )
  const onSort = useCallback((column: AdxAccountConversionOrderBy) => {
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
      await adxApi.deleteAccountConversion(deleting.id)
      toast.success('Conversion mapping deleted successfully')
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
      account_id:
        typeof values.account_id === 'string' && values.account_id ? values.account_id : null,
      source: typeof values.source === 'string' ? values.source : null,
      conversion_type: typeof values.conversion_type === 'string' ? values.conversion_type : null,
    }))
  }, [])

  const onResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'account_id',
        label: 'Account ID',
        type: 'input',
        value: filters.account_id ?? null,
        placeholder: 'Account ID...',
      },
      {
        field: 'source',
        label: 'Source',
        type: 'select',
        value: filters.source ?? null,
        options: SOURCE_OPTIONS_SELECT,
        placeholder: 'All sources',
      },
      {
        field: 'conversion_type',
        label: 'Conversion Type',
        type: 'select',
        value: filters.conversion_type ?? null,
        options: CONVERSION_TYPE_OPTIONS_SELECT,
        placeholder: 'All types',
      },
    ],
    [filters],
  )

  return (
    <div className="flex flex-col gap-6">
      <FilterPanel fields={filterFields} onReset={onResetFilters} applyMode onApply={onApplyFilters} />
      <section className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        <Toolbar
          title="Account Conversions"
          subtitle="Google Ads conversion actions mapped per account and funnel event."
          canCreate={access.createConversion}
          createLabel="Create mapping"
          onCreate={() => setDialogOpen(true)}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton column="account_id" sort={sort} onSort={onSort}>Account</SortButton>
              </TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Action ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <EmptyRow colSpan={6}>Loading mappings...</EmptyRow>
            ) : items.length === 0 ? (
              <EmptyRow colSpan={6}>No conversion mappings found.</EmptyRow>
            ) : (
              items.map((conversion) => (
                <TableRow key={conversion.id}>
                  <TableCell><MonoText value={conversion.account_id} /></TableCell>
                  <TableCell><StatusPill value={conversion.source} /></TableCell>
                  <TableCell><HumanText value={conversion.conversion_type} /></TableCell>
                  <TableCell><MonoText value={conversion.conversion_action_id} /></TableCell>
                  <TableCell><StatusPill value={conversion.status} /></TableCell>
                  <TableCell>
                    <RowActions
                      row={conversion}
                      canUpdate={access.updateConversion}
                      canDelete={access.deleteConversion}
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
      <AdxAccountConversionDialog
        open={dialogOpen}
        conversion={editing}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null) }}
        onSuccess={reload}
      />
      <AdxDeleteDialog
        open={Boolean(deleting)}
        deleting={deleteBusy}
        onOpenChange={(open) => { if (!open) setDeleting(null) }}
        title="Delete Conversion Mapping"
        description={
          <>
            Are you sure you want to delete mapping for{' '}
            <span className="font-medium text-foreground">{deleting?.account_id}</span>?
          </>
        }
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}

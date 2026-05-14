import { useCallback, useEffect, useMemo, useState } from 'react'
import { FilePlus2, Users } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { adxApi } from '@/features/adx/api'
import {
  AdxAccountBulkInsertDialog,
  AdxAccountDialog,
  AdxDeleteDialog,
  AssignUserAdxAccountsDialog,
} from '@/features/adx/components'
import {
  ACCOUNT_STATUS_OPTIONS,
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
  AdxAccount,
  AdxAccountFilterParams,
  AdxAccountOrderBy,
  PaginationMeta,
} from '@/features/adx/types'
import { PermissionSlugs, hasPermission } from '@/constants/permissions'
import { useAuthStore } from '@/hooks/useAuthStore'
import { formatApiError } from '@/features/settings/components'
import { Table } from '@/components/ui/table'

const DEFAULT_PAGE_SIZE = 15

const DEFAULT_FILTERS: AdxAccountFilterParams = {
  page: 1,
  per_page: DEFAULT_PAGE_SIZE,
  query: null,
  source: null,
  status: null,
  order_by: 'id',
  order: 'desc',
}

const SOURCE_OPTIONS_SELECT = SOURCE_OPTIONS.map((s) => ({ value: s, label: s }))
const STATUS_OPTIONS_SELECT = ACCOUNT_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))

export function AdxAccountsPage() {
  const user = useAuthStore((s) => s.user)
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions])
  const access = useMemo(
    () => ({
      createAccount: hasPermission(permissions, PermissionSlugs.AdxAccountsCreate),
      updateAccount: hasPermission(permissions, PermissionSlugs.AdxAccountsUpdate),
      deleteAccount: hasPermission(permissions, PermissionSlugs.AdxAccountsDelete),
      assignAccount: hasPermission(permissions, PermissionSlugs.AdxAccountsAssign),
    }),
    [permissions],
  )

  const [items, setItems] = useState<AdxAccount[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<AdxAccountFilterParams>(DEFAULT_FILTERS)
  const [refresh, setRefresh] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bulkInsertOpen, setBulkInsertOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [editing, setEditing] = useState<AdxAccount | null>(null)
  const [deleting, setDeleting] = useState<AdxAccount | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const reload = useCallback(() => setRefresh((v) => v + 1), [])

  useEffect(() => {
    let ignore = false
    async function run() {
      try {
        setLoading(true)
        const { data } = await adxApi.listAccounts(filters)
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

  const sort = useMemo<SortState<AdxAccountOrderBy>>(
    () => ({ order_by: filters.order_by ?? null, order: filters.order ?? null }),
    [filters.order, filters.order_by],
  )
  const onSort = useCallback((column: AdxAccountOrderBy) => {
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
      await adxApi.deleteAccount(deleting.id)
      toast.success('AdX account deleted successfully')
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
      query: typeof values.query === 'string' && values.query ? values.query : null,
      source: typeof values.source === 'string' ? values.source : null,
      status: typeof values.status === 'string' ? values.status : null,
    }))
  }, [])

  const onResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const onBulkInsertClick = useCallback(() => {
    if (!access.createAccount) {
      toast.error('You do not have permission to create accounts.')
      return
    }
    setBulkInsertOpen(true)
  }, [access.createAccount])

  const onAssignClick = useCallback(() => {
    if (!access.assignAccount) {
      toast.error('You do not have permission to assign accounts.')
      return
    }
    setAssignOpen(true)
  }, [access.assignAccount])

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'query',
        label: 'Search',
        type: 'input',
        value: filters.query ?? null,
        placeholder: 'Search accounts...',
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
      <FilterPanel
        fields={filterFields}
        onReset={onResetFilters}
        applyMode
        onApply={onApplyFilters}
      />
      <section className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        <Toolbar
          title="Accounts"
          subtitle="Dedicated Google/Facebook ad accounts used by AdX revenue tracking."
          canCreate={access.createAccount}
          createLabel="Create account"
          onCreate={() => setDialogOpen(true)}
        >
          {access.assignAccount ? (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onAssignClick}>
              <Users className="size-3.5" />
              Assign Accounts
            </Button>
          ) : null}
          {access.createAccount ? (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={onBulkInsertClick}>
              <FilePlus2 className="size-3.5" />
              Bulk Insert
            </Button>
          ) : null}
        </Toolbar>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton column="account_id" sort={sort} onSort={onSort}>
                  Account
                </SortButton>
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fetch</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <EmptyRow colSpan={6}>Loading accounts...</EmptyRow>
            ) : items.length === 0 ? (
              <EmptyRow colSpan={6}>No accounts found.</EmptyRow>
            ) : (
              items.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <MonoText value={account.account_id} />
                  </TableCell>
                  <TableCell>{account.account_name ?? '-'}</TableCell>
                  <TableCell>
                    <StatusPill value={account.source} />
                  </TableCell>
                  <TableCell>
                    <StatusPill value={account.status} />
                  </TableCell>
                  <TableCell>{account.is_special ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <RowActions
                      row={account}
                      canUpdate={access.updateAccount}
                      canDelete={access.deleteAccount}
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
      <AdxAccountDialog
        open={dialogOpen}
        account={editing}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditing(null)
        }}
        onSuccess={reload}
      />
      {access.createAccount ? (
        <AdxAccountBulkInsertDialog
          open={bulkInsertOpen}
          onOpenChange={setBulkInsertOpen}
          onSuccess={reload}
        />
      ) : null}
      {access.assignAccount ? (
        <AssignUserAdxAccountsDialog open={assignOpen} onOpenChange={setAssignOpen} />
      ) : null}
      <AdxDeleteDialog
        open={Boolean(deleting)}
        deleting={deleteBusy}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Delete AdX Account"
        description={
          <>
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">{deleting?.account_id}</span>?
          </>
        }
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}

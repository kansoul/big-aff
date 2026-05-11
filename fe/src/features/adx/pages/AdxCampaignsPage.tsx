import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import { adxApi } from '@/features/adx/api'
import {
  DateText,
  EmptyRow,
  MonoText,
  PaginationBar,
  SOURCE_OPTIONS,
  SortButton,
  STATUS_OPTIONS,
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
  AdxCampaign,
  AdxCampaignFilterParams,
  AdxCampaignOrderBy,
  PaginationMeta,
} from '@/features/adx/types'
import { formatApiError } from '@/features/settings/components'
import { Table } from '@/components/ui/table'

const DEFAULT_PAGE_SIZE = 15

const DEFAULT_FILTERS: AdxCampaignFilterParams = {
  page: 1,
  per_page: DEFAULT_PAGE_SIZE,
  keyword: null,
  source: null,
  account_id: null,
  campaign_id: null,
  status: null,
  order_by: 'id',
  order: 'desc',
}

const SOURCE_OPTIONS_SELECT = SOURCE_OPTIONS.map((s) => ({ value: s, label: s }))
const STATUS_OPTIONS_SELECT = STATUS_OPTIONS.map((s) => ({ value: s, label: s }))

function money(value: string | number | null | undefined): string {
  return Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function AdxCampaignsPage() {
  const [items, setItems] = useState<AdxCampaign[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<AdxCampaignFilterParams>(DEFAULT_FILTERS)

  useEffect(() => {
    let ignore = false
    async function run() {
      try {
        setLoading(true)
        const { data } = await adxApi.listCampaigns(filters)
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
  }, [filters])

  const sort = useMemo<SortState<AdxCampaignOrderBy>>(
    () => ({ order_by: filters.order_by ?? null, order: filters.order ?? null }),
    [filters.order, filters.order_by],
  )
  const onSort = useCallback((column: AdxCampaignOrderBy) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      order_by: column,
      order: prev.order_by === column && prev.order === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  const onApplyFilters = useCallback((values: Record<string, unknown>) => {
    setFilters((prev) => ({
      ...prev,
      page: 1,
      keyword: typeof values.keyword === 'string' && values.keyword ? values.keyword : null,
      source: typeof values.source === 'string' ? values.source : null,
      account_id:
        typeof values.account_id === 'string' && values.account_id ? values.account_id : null,
      campaign_id:
        typeof values.campaign_id === 'string' && values.campaign_id ? values.campaign_id : null,
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
        placeholder: 'Search campaigns...',
      },
      {
        field: 'account_id',
        label: 'Account ID',
        type: 'input',
        value: filters.account_id ?? null,
        placeholder: 'Account ID...',
      },
      {
        field: 'campaign_id',
        label: 'Campaign ID',
        type: 'input',
        value: filters.campaign_id ?? null,
        placeholder: 'Campaign ID...',
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
      <FilterPanel fields={filterFields} onReset={onResetFilters} applyMode onApply={onApplyFilters} />
      <section className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        <Toolbar title="Campaigns" subtitle="Synchronized campaigns from Google/Facebook ads." />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton column="campaign_id" sort={sort} onSort={onSort}>Campaign ID</SortButton>
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>GAM Target</TableHead>
              <TableHead>Last Seen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <EmptyRow colSpan={8}>Loading campaigns...</EmptyRow>
            ) : items.length === 0 ? (
              <EmptyRow colSpan={8}>No campaigns found.</EmptyRow>
            ) : (
              items.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell><MonoText value={campaign.campaign_id} /></TableCell>
                  <TableCell>{campaign.campaign_name ?? '-'}</TableCell>
                  <TableCell><StatusPill value={campaign.source} /></TableCell>
                  <TableCell><MonoText value={campaign.account?.account_id} /></TableCell>
                  <TableCell>{money(campaign.daily_budget)}</TableCell>
                  <TableCell><StatusPill value={campaign.status} /></TableCell>
                  <TableCell>
                    <MonoText value={`${campaign.gam_custom_key}=${campaign.gam_custom_value ?? '-'}`} />
                  </TableCell>
                  <TableCell><DateText value={campaign.last_seen_at} /></TableCell>
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
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { campaignReportApi } from '@/features/campaign-report/api'
import {
  CampaignReportDetailTab,
  CampaignReportTableCard,
  CampaignReportWorkspaceTabs,
  type CampaignReportWorkspaceTab,
} from '@/features/campaign-report/components'
import type {
  CampaignReportFilterParams,
  CampaignReportFiltersResponse,
  CampaignReportListResponse,
  CampaignReportOrder,
  CampaignReportOrderBy,
  CampaignReportRow,
  CampaignReportSummary,
} from '@/features/campaign-report/types'
import {
  FilterPanel,
  type FilterFieldDef,
  type SelectOption,
} from '@/components/common/FilterPanel'
import type { DateRangeValue } from '@/components/ui/date-range-picker-presets'
import { formatApiError } from '@/features/settings/components'
import { useAuthStore } from '@/hooks/useAuthStore'
import { getUserRole } from '@/constants/role'
import dayjs from '@/lib/dayjs'

type FilterOptions = CampaignReportFiltersResponse['data']

type CampaignReportDetailWorkspaceTab = CampaignReportWorkspaceTab & {
  initialFilters: CampaignReportFilterParams
}

const AUTO_REFETCH_INTERVAL_MS = 60_000

const DEFAULT_FILTERS: CampaignReportFilterParams = {
  date_from: dayjs().format('YYYY-MM-DD'),
  date_to: dayjs().format('YYYY-MM-DD'),
  keyword: null,
  user_ids: [],
  account_ids: [],
  ads_type: null,
  campaign_ids: [],
  page: 1,
  per_page: 30,
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

function parseFiltersFromUrl(params: URLSearchParams): CampaignReportFilterParams {
  return {
    date_from: params.get('date_from') ?? DEFAULT_FILTERS.date_from,
    date_to: params.get('date_to') ?? DEFAULT_FILTERS.date_to,
    keyword: params.get('keyword') ?? null,
    user_ids: params
      .getAll('user_ids[]')
      .map(Number)
      .filter((n) => !Number.isNaN(n)),
    account_ids: params.getAll('account_ids[]').filter(Boolean),
    ads_type: params.get('ads_type') ?? null,
    campaign_ids: params.getAll('campaign_ids[]'),
    order_by: (params.get('order_by') as CampaignReportOrderBy) ?? undefined,
    order: (params.get('order') as CampaignReportOrder) ?? undefined,
    page: params.get('page') ? Number(params.get('page')) : 1,
    per_page: params.get('per_page') ? Number(params.get('per_page')) : 30,
  }
}

function buildUrlParams(filters: CampaignReportFilterParams): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.date_from) params.set('date_from', filters.date_from)
  if (filters.date_to) params.set('date_to', filters.date_to)
  if (filters.keyword) params.set('keyword', filters.keyword)
  ;(filters.user_ids ?? []).forEach((id) => params.append('user_ids[]', String(id)))
  ;(filters.account_ids ?? []).forEach((id) => params.append('account_ids[]', String(id)))
  if (filters.ads_type) params.set('ads_type', filters.ads_type)
  ;(filters.campaign_ids ?? []).forEach((id) => params.append('campaign_ids[]', id))
  if (filters.order_by) params.set('order_by', filters.order_by)
  if (filters.order) params.set('order', filters.order)
  if (filters.page && filters.page !== 1) params.set('page', String(filters.page))
  if (filters.per_page && filters.per_page !== 30) params.set('per_page', String(filters.per_page))
  return params
}

function tabFiltersKey(campaignId: string): string {
  return `cr_tab_${campaignId}`
}

function tabNameKey(campaignId: string): string {
  return `cr_tab_name_${campaignId}`
}

function parseWorkspaceTabs(
  params: URLSearchParams,
  fallbackFilters: CampaignReportFilterParams,
): CampaignReportDetailWorkspaceTab[] {
  return (params.get('cr_tabs') ?? '')
    .split(',')
    .filter(Boolean)
    .map((campaignId) => {
      let storedFilters: CampaignReportFilterParams = fallbackFilters
      const rawFilters = params.get(tabFiltersKey(campaignId))
      if (rawFilters) {
        try {
          const parsed: unknown = JSON.parse(rawFilters)
          if (parsed && typeof parsed === 'object') {
            storedFilters = {
              ...fallbackFilters,
              ...(parsed as Partial<CampaignReportFilterParams>),
            }
          }
        } catch {
          // Ignore malformed workspace parameters and use the main report filters instead.
        }
      }

      return {
        id: campaignId,
        campaignId,
        campaignName: params.get(tabNameKey(campaignId)) ?? campaignId,
        initialFilters: { ...storedFilters, campaign_ids: [campaignId] },
      }
    })
}

const EMPTY_OPTIONS: FilterOptions = {
  users: [],
  accounts: [],
  campaigns: [],
  channels: [],
  ads_types: [],
}

function parseDateRange(value: unknown): DateRangeValue | null {
  if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
    const next = value as DateRangeValue
    return { from: next.from ?? null, to: next.to ?? null }
  }
  return null
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string')
}

function parseNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => Number(v)).filter((n) => !Number.isNaN(n))
}

function parseStringOrNull(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0 && value !== '__none__') return value
  return null
}

export function CampaignReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [filters, setFilters] = useState<CampaignReportFilterParams>(() =>
    parseFiltersFromUrl(searchParams),
  )
  const [tabs, setTabs] = useState<CampaignReportDetailWorkspaceTab[]>(() =>
    parseWorkspaceTabs(searchParams, parseFiltersFromUrl(searchParams)),
  )
  const [activeTabId, setActiveTabId] = useState(() => {
    const activeTab = searchParams.get('cr_active')
    return activeTab && tabs.some((tab) => tab.id === activeTab) ? activeTab : 'home'
  })
  const activeDetailTab = tabs.find((tab) => tab.id === activeTabId)

  useEffect(() => {
    setSearchParams(
      (current) => {
        const activeFilters =
          activeTabId === 'home' ? filters : (activeDetailTab?.initialFilters ?? filters)
        const next = buildUrlParams(activeFilters)
        if (tabs.length) next.set('cr_tabs', tabs.map((tab) => tab.id).join(','))
        if (activeTabId !== 'home') next.set('cr_active', activeTabId)
        tabs.forEach((tab) => {
          next.set(tabFiltersKey(tab.id), JSON.stringify(tab.initialFilters))
          next.set(tabNameKey(tab.id), tab.campaignName)
        })
        return next.toString() === current.toString() ? current : next
      },
      { replace: true },
    )
  }, [activeDetailTab, activeTabId, filters, setSearchParams, tabs])

  const user = useAuthStore((s) => s.user)
  const userPermissions = useMemo(() => user?.permissions ?? [], [user?.permissions])

  const role = getUserRole(user?.roles ?? [], !!user?.is_admin)

  const [options, setOptions] = useState<FilterOptions>(EMPTY_OPTIONS)

  const [rows, setRows] = useState<CampaignReportRow[]>([])
  const [toggling, setToggling] = useState<Record<string, boolean>>({})
  const [rowCount, setRowCount] = useState(0)
  const [grandSummary, setGrandSummary] = useState<CampaignReportSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const latestLoadId = useRef(0)

  useEffect(() => {
    let cancelled = false
    campaignReportApi
      .filters()
      .then((res) => {
        if (cancelled) return
        setOptions(res.data.data)
      })
      .catch((err) => {
        toast.error(formatApiError(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loadData = useCallback(
    async (activeFilters: CampaignReportFilterParams, options?: { showLoading?: boolean }) => {
      const showLoading = options?.showLoading ?? true
      const loadId = ++latestLoadId.current

      try {
        if (showLoading) setLoading(true)
        const { data }: { data: CampaignReportListResponse } =
          await campaignReportApi.list(activeFilters)
        if (loadId !== latestLoadId.current) return
        setRows(data.data)
        setRowCount(data.pagination.total)
        setGrandSummary(data.grand_summary)
      } catch (err) {
        if (showLoading && loadId === latestLoadId.current) toast.error(formatApiError(err))
      } finally {
        if (showLoading && loadId === latestLoadId.current) setLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (activeTabId !== 'home') return
    void loadData(filters)
  }, [activeTabId, loadData, filters])

  useEffect(() => {
    if (activeTabId !== 'home') return
    const interval = window.setInterval(() => {
      void loadData(filters, { showLoading: false })
    }, AUTO_REFETCH_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [activeTabId, loadData, filters])

  const onToggleCampaignStatus = useCallback(async (campaignId: string, checked: boolean) => {
    const next: 'ACTIVE' | 'PAUSED' = checked ? 'ACTIVE' : 'PAUSED'

    setToggling((prev) => ({ ...prev, [campaignId]: true }))
    try {
      const { data } = await campaignReportApi.toggleStatus(campaignId, next)
      const updatedStatus = data.data.status

      const applyStatus = (r: CampaignReportRow): CampaignReportRow =>
        r.campaign_id === campaignId ? { ...r, campaign_status: updatedStatus } : r

      setRows((prev) => prev.map(applyStatus))

      toast.success(`Campaign is now ${updatedStatus}`)
    } catch (err) {
      toast.error(formatApiError(err))
    } finally {
      setToggling((prev) => ({ ...prev, [campaignId]: false }))
    }
  }, [])

  const handleToggleCampaignStatus = useCallback(
    (campaignId: string, checked: boolean) => {
      void onToggleCampaignStatus(campaignId, checked)
    },
    [onToggleCampaignStatus],
  )

  const onApplyFilters = useCallback((values: Record<string, unknown>) => {
    const range = parseDateRange(values.date_range)
    setFilters((prev) => ({
      ...prev,
      date_from: range?.from ?? null,
      date_to: range?.to ?? null,
      keyword: parseStringOrNull(values.keyword),
      user_ids: parseNumberArray(values.user_ids),
      account_ids: parseStringArray(values.account_ids),
      ads_type: parseStringOrNull(values.ads_type),
      campaign_ids: parseStringArray(values.campaign_ids),
      page: 1,
    }))
  }, [])

  const onResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const onPaginationChange = useCallback((page: number, perPage: number) => {
    setFilters((prev) => ({ ...prev, page, per_page: perPage }))
  }, [])

  const onSortingChange = useCallback(
    (orderBy: CampaignReportOrderBy | null, order: CampaignReportOrder | null) => {
      setFilters((prev) => ({
        ...prev,
        order_by: orderBy ?? undefined,
        order: order ?? undefined,
        page: 1,
      }))
    },
    [],
  )

  const onOpenCampaign = useCallback(
    (campaign: CampaignReportRow) => {
      const tabId = campaign.campaign_id
      setTabs((previous) => {
        if (previous.some((tab) => tab.id === tabId)) return previous
        return [
          ...previous,
          {
            id: tabId,
            campaignId: campaign.campaign_id,
            campaignName: campaign.campaign_name ?? campaign.campaign_id,
            initialFilters: { ...filters, campaign_ids: [campaign.campaign_id], page: 1 },
          },
        ]
      })
      setActiveTabId(tabId)
    },
    [filters],
  )

  const onActivateTab = useCallback((tabId: string) => {
    setActiveTabId(tabId)

    if (tabId !== 'home') return

    setFilters((previous) => {
      if (!previous.campaign_ids?.length) return previous
      return { ...previous, campaign_ids: [], page: 1 }
    })
  }, [])

  const onCloseTab = useCallback(
    (tabId: string) => {
      setTabs((previous) => previous.filter((tab) => tab.id !== tabId))
      if (activeTabId !== tabId) return
      onActivateTab('home')
    },
    [activeTabId, onActivateTab],
  )

  const onTabFiltersChange = useCallback(
    (tabId: string, nextFilters: CampaignReportFilterParams) => {
      setTabs((previous) =>
        previous.map((tab) => (tab.id === tabId ? { ...tab, initialFilters: nextFilters } : tab)),
      )
    },
    [],
  )

  const userOptions = useMemo<SelectOption[]>(
    () => options.users.map((u) => ({ value: String(u.id), label: u.name })),
    [options.users],
  )

  const accountOptions = useMemo<SelectOption[]>(
    () =>
      options.accounts.map((a) => ({
        value: a.account_id,
        label: a.account_name ? `${a.account_name} (${a.account_id})` : a.account_id,
      })),
    [options.accounts],
  )

  const campaignOptions = useMemo<SelectOption[]>(
    () =>
      options.campaigns.map((c) => ({
        value: c.campaign_id,
        label: c.campaign_name ? `${c.campaign_name} (${c.campaign_id})` : c.campaign_id,
      })),
    [options.campaigns],
  )

  const adsTypeOptions = useMemo<SelectOption[]>(
    () => options.ads_types.map((t) => ({ value: t.value, label: t.label })),
    [options.ads_types],
  )

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        field: 'date_range',
        label: 'Date Range',
        type: 'daterange',
        value: {
          from: filters.date_from ?? null,
          to: filters.date_to ?? null,
        },
        placeholder: 'Select date range',
      },
      {
        field: 'keyword',
        label: 'Search',
        type: 'input',
        value: filters.keyword ?? null,
        placeholder: 'Campaign, account, or Ads Link...',
      },
      {
        field: 'user_ids',
        label: 'User',
        type: 'multiselect',
        hidden: role.isMember,
        value: (filters.user_ids ?? []).map(String),
        options: userOptions,
        placeholder: 'All users',
      },
      {
        field: 'account_ids',
        label: 'Account Ads',
        type: 'multiselect',
        value: (filters.account_ids ?? []).map(String),
        options: accountOptions,
        placeholder: 'All accounts',
      },
      {
        field: 'ads_type',
        label: 'Ads Type',
        type: 'select',
        value: filters.ads_type ?? null,
        options: adsTypeOptions,
        placeholder: 'All types',
      },
      {
        field: 'campaign_ids',
        label: 'Campaign',
        type: 'multiselect',
        value: filters.campaign_ids ?? [],
        options: campaignOptions,
        placeholder: 'All campaigns',
      },
    ],
    [filters, userOptions, accountOptions, adsTypeOptions, campaignOptions, role],
  )

  const activeDetailTabId = activeDetailTab?.id
  const onActiveTabFiltersChange = useCallback(
    (nextFilters: CampaignReportFilterParams) => {
      if (!activeDetailTabId) return
      onTabFiltersChange(activeDetailTabId, nextFilters)
    },
    [activeDetailTabId, onTabFiltersChange],
  )
  const workspaceTabs = (
    <CampaignReportWorkspaceTabs
      activeTabId={activeTabId}
      tabs={tabs}
      onActivateTab={onActivateTab}
      onCloseTab={onCloseTab}
    />
  )

  return (
    <section className="h-[calc(100dvh-4.5rem)] min-h-0 md:h-[calc(100dvh-2rem)]">
      {activeTabId === 'home' ? (
        <div className="flex h-full min-h-0 flex-col">
          <div className="mb-4 shrink-0">
            <FilterPanel
              fields={filterFields}
              onReset={onResetFilters}
              applyMode
              onApply={onApplyFilters}
            />
          </div>
          <div className="shrink-0">{workspaceTabs}</div>

          <div className="min-h-0 flex-1">
            <CampaignReportTableCard
              data={rows}
              rowCount={rowCount}
              loading={loading}
              filters={filters}
              filterOptions={options}
              summary={grandSummary}
              toggling={toggling}
              userPermissions={userPermissions}
              onPaginationChange={onPaginationChange}
              onSortingChange={onSortingChange}
              onToggleCampaignStatus={handleToggleCampaignStatus}
              onOpenCampaign={onOpenCampaign}
              role={role}
            />
          </div>
        </div>
      ) : (
        activeDetailTab && (
          <CampaignReportDetailTab
            key={activeDetailTab.id}
            campaignId={activeDetailTab.campaignId}
            initialFilters={activeDetailTab.initialFilters}
            filterOptions={options}
            userPermissions={userPermissions}
            role={role}
            onOpenCampaign={onOpenCampaign}
            onFiltersChange={onActiveTabFiltersChange}
            workspaceTabs={workspaceTabs}
          />
        )
      )}
    </section>
  )
}

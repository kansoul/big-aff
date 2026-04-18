import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { toast } from 'sonner'

import { adsReportApi } from '@/features/ads-report/api'
import { AdsReportSummaryCards } from '@/features/ads-report/components'
import type {
  AdsReportAdsType,
  AdsReportStatsData,
  AdsReportStatsFilterParams,
} from '@/features/ads-report/types'
import { FilterPanel, type FilterFieldDef, type SelectOption } from '@/components/common/FilterPanel'
import type { DateRangeValue } from '@/components/ui/date-range-picker-presets'
import { accountsApi } from '@/features/accounts/api'
import { teamsApi } from '@/features/teams/api'
import type { Account } from '@/features/accounts/types'

const DEFAULT_FILTERS: AdsReportStatsFilterParams = {
  date_from: dayjs().startOf('month').format('YYYY-MM-DD'),
  date_to: dayjs().endOf('month').format('YYYY-MM-DD'),
}

function parseDateRange(value: unknown): DateRangeValue | null {
  if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
    const next = value as DateRangeValue
    return { from: next.from ?? null, to: next.to ?? null }
  }
  return null
}

function accountsToOptions(accounts: Account[]): SelectOption[] {
  return accounts.map((a) => ({
    value: a.account_id,
    label: a.account_name ? `${a.account_name}` : a.account_id,
  }))
}

function teamsToOptions(teams: { id: number; name: string }[]): SelectOption[] {
  return teams.map((t) => ({ value: String(t.id), label: t.name }))
}

export function AdsReportPage() {
  const [filters, setFilters] = useState<AdsReportStatsFilterParams>(DEFAULT_FILTERS)
  const [statsData, setStatsData] = useState<AdsReportStatsData | null>(null)
  const [loading, setLoading] = useState(false)

  const [accountOptions, setAccountOptions] = useState<SelectOption[]>([])
  const [teamOptions, setTeamOptions] = useState<SelectOption[]>([])

  useEffect(() => {
    void Promise.all([accountsApi.list({ page: 1, per_page: 100 }), teamsApi.listOptions()]).then(
      ([accountsRes, teamsRes]) => {
        setAccountOptions(accountsToOptions(accountsRes.data.data))
        setTeamOptions(teamsToOptions(teamsRes.data.data))
      },
    )
  }, [])

  const loadData = useCallback(async (activeFilters: AdsReportStatsFilterParams) => {
    try {
      setLoading(true)
      const { data: res } = await adsReportApi.stats(activeFilters)
      setStatsData(res.data)
    } catch {
      toast.error('Failed to load ads report data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData(filters)
  }, [loadData, filters])

  const onApplyFilters = useCallback((values: Record<string, unknown>) => {
    const range = parseDateRange(values.date_range)
    setFilters({
      date_from: range?.from ?? null,
      date_to: range?.to ?? null,
      account_id: (values.account_id as string | null) ?? null,
      ads_type: (values.ads_type as AdsReportAdsType | null) ?? null,
      team_id: values.team_id ? Number(values.team_id) : null,
    })
  }, [])

  const onResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

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
        field: 'account_id',
        label: 'Account',
        type: 'select',
        value: filters.account_id ?? null,
        options: accountOptions,
        placeholder: 'All accounts',
      },
      {
        field: 'ads_type',
        label: 'Ads Type',
        type: 'select',
        value: filters.ads_type ?? null,
        options: [
          { value: 'facebook', label: 'Facebook' },
          { value: 'google', label: 'Google' },
        ],
        placeholder: 'All types',
      },
      {
        field: 'team_id',
        label: 'Team',
        type: 'select',
        value: filters.team_id != null ? String(filters.team_id) : null,
        options: teamOptions,
        placeholder: 'All teams',
      },
    ],
    [filters, accountOptions, teamOptions],
  )

  return (
    <div className="space-y-6">
      <FilterPanel
        fields={filterFields}
        onReset={onResetFilters}
        applyMode
        onApply={onApplyFilters}
      />

      <AdsReportSummaryCards data={statsData} loading={loading} />
    </div>
  )
}

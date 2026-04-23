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
import {
  FilterPanel,
  type FilterFieldDef,
  type SelectOption,
} from '@/components/common/FilterPanel'
import type { DateRangeValue } from '@/components/ui/date-range-picker-presets'
import { campaignReportApi } from '@/features/campaign-report/api'
import { teamsApi } from '@/features/teams/api'
import type { TeamWithAccountOptions } from '@/features/teams/types'

const DEFAULT_FILTERS: AdsReportStatsFilterParams = {
  date_from: dayjs().startOf('month').format('YYYY-MM-DD'),
  date_to: dayjs().endOf('month').format('YYYY-MM-DD'),
  campaign_ids: [],
}

function parseDateRange(value: unknown): DateRangeValue | null {
  if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
    const next = value as DateRangeValue
    return { from: next.from ?? null, to: next.to ?? null }
  }
  return null
}

function accountsToOptions(accounts: TeamWithAccountOptions['accounts']): SelectOption[] {
  return accounts.map((a) => ({
    value: a.account_id,
    label: a.account_name ? `${a.account_name}` : a.account_id,
  }))
}

function teamsToOptions(teams: TeamWithAccountOptions[]): SelectOption[] {
  return teams.map((t) => ({ value: String(t.id), label: t.name }))
}

function getAccountsForFilters(
  teams: TeamWithAccountOptions[],
  teamId?: number | null,
  adsType?: AdsReportAdsType | null,
) {
  return teams
    .filter((team) => teamId == null || team.id === teamId)
    .flatMap((team) => team.accounts)
    .filter((account) => !adsType || account.ads_type === adsType)
}

export function AdsReportPage() {
  const [filters, setFilters] = useState<AdsReportStatsFilterParams>(DEFAULT_FILTERS)
  const [statsData, setStatsData] = useState<AdsReportStatsData | null>(null)
  const [loading, setLoading] = useState(false)

  const [teamsWithAccounts, setTeamsWithAccounts] = useState<TeamWithAccountOptions[]>([])
  const [showTeamFilter, setShowTeamFilter] = useState(false)
  const [allCampaigns, setAllCampaigns] = useState<
    Array<{
      campaign_id: string
      campaign_name: string | null
      account_id: string | null
      ads_type: string | null
    }>
  >([])

  useEffect(() => {
    void teamsApi.accountOptions().then((res) => {
      setTeamsWithAccounts(res.data.data.teams)
      setShowTeamFilter(res.data.data.show_team_filter)
    })
    void campaignReportApi.filters().then((res) => {
      setAllCampaigns(res.data.data.campaigns)
    })
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

  const onFieldChange = useCallback(
    (field: string, value: unknown) => {
      setFilters((prev) => {
        const next: AdsReportStatsFilterParams = { ...prev }

        if (field === 'date_range') {
          const range = parseDateRange(value)
          next.date_from = range?.from ?? null
          next.date_to = range?.to ?? null
        }

        if (field === 'team_id') {
          next.team_id = value ? Number(value) : null
        }

        if (field === 'ads_type') {
          next.ads_type = (value as AdsReportAdsType | null) ?? null
        }

        if (field === 'account_id') {
          next.account_id = (value as string | null) ?? null
        }

        if (field === 'campaign_ids') {
          next.campaign_ids = value as string[]
        }

        if (field === 'team_id' || field === 'ads_type') {
          const nextAccountIds = new Set(
            getAccountsForFilters(teamsWithAccounts, next.team_id, next.ads_type).map(
              (account) => account.account_id,
            ),
          )

          if (next.account_id && !nextAccountIds.has(next.account_id)) {
            next.account_id = null
          }
        }

        if (field === 'team_id' || field === 'ads_type' || field === 'account_id') {
          next.campaign_ids = []
        }

        return next
      })
    },
    [teamsWithAccounts],
  )

  const onResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const accountOptions = useMemo(
    () =>
      accountsToOptions(
        getAccountsForFilters(teamsWithAccounts, filters.team_id, filters.ads_type),
      ),
    [teamsWithAccounts, filters.team_id, filters.ads_type],
  )

  const campaignOptions = useMemo<SelectOption[]>(
    () =>
      allCampaigns
        .filter(
          (c) =>
            (!filters.account_id || c.account_id === filters.account_id) &&
            (!filters.ads_type || c.ads_type === filters.ads_type),
        )
        .map((c) => ({
          value: c.campaign_id,
          label: c.campaign_name ?? c.campaign_id,
        })),
    [allCampaigns, filters.account_id, filters.ads_type],
  )

  const teamOptions = useMemo(() => teamsToOptions(teamsWithAccounts), [teamsWithAccounts])

  const filterFields = useMemo<FilterFieldDef[]>(() => {
    const fields: FilterFieldDef[] = [
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
    ]

    if (showTeamFilter) {
      fields.push({
        field: 'team_id',
        label: 'Team',
        type: 'select',
        value: filters.team_id != null ? String(filters.team_id) : null,
        options: teamOptions,
        placeholder: 'All teams',
      })
    }

    fields.push(
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
        field: 'account_id',
        label: 'Account',
        type: 'select',
        value: filters.account_id ?? null,
        options: accountOptions,
        placeholder: 'All accounts',
      },
      {
        field: 'campaign_ids',
        label: 'Campaigns',
        type: 'multiselect',
        value: filters.campaign_ids ?? [],
        options: campaignOptions,
        placeholder: 'All campaigns',
      },
    )

    return fields
  }, [filters, accountOptions, campaignOptions, showTeamFilter, teamOptions])

  return (
    <div className="space-y-6">
      <FilterPanel fields={filterFields} onReset={onResetFilters} onFieldChange={onFieldChange} />

      <AdsReportSummaryCards data={statsData} loading={loading} />
    </div>
  )
}

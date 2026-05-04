import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from '@/lib/dayjs'
import { toast } from 'sonner'

import { adsReportApi } from '@/features/ads-report/api'
import { AdsReportSummaryCards } from '@/features/ads-report/components'
import type {
  AdsReportAdsType,
  AdsReportOptionAccount,
  AdsReportOptionCampaign,
  AdsReportOptionTeam,
  AdsReportStatsData,
  AdsReportStatsFilterParams,
} from '@/features/ads-report/types'
import {
  FilterPanel,
  type FilterFieldDef,
  type SelectOption,
} from '@/components/common/FilterPanel'
import type { DateRangeValue } from '@/components/ui/date-range-picker-presets'

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

function accountsToOptions(accounts: AdsReportOptionAccount[]): SelectOption[] {
  return accounts.map((a) => ({
    value: a.account_id,
    label: a.account_name ? `${a.account_name}` : a.account_id,
  }))
}

function teamsToOptions(teams: AdsReportOptionTeam[]): SelectOption[] {
  return teams.map((t) => ({ value: String(t.id), label: t.name }))
}

function getAccountsForFilters(
  teams: AdsReportOptionTeam[],
  teamId?: number | null,
  adsType?: AdsReportAdsType | null,
) {
  let accounts: AdsReportOptionAccount[] = []
  if (teamId) {
    const team = teams.find((t) => t.id === teamId)
    accounts = team ? team.accounts : []
  } else {
    const accMap = new Map<string, AdsReportOptionAccount>()
    teams.forEach((t) => {
      t.accounts.forEach((a) => {
        accMap.set(a.account_id, a)
      })
    })
    accounts = Array.from(accMap.values())
  }

  if (adsType) {
    accounts = accounts.filter((a) => a.ads_type === adsType)
  }

  return accounts
}

function getCampaignsForFilters(
  campaigns: AdsReportOptionCampaign[],
  accounts: AdsReportOptionAccount[],
  accountId?: string | null,
  adsType?: AdsReportAdsType | null,
) {
  const accountIds = new Set(accounts.map((a) => a.account_id))
  return campaigns.filter((c) => {
    const matchesAccount = !accountId ? accountIds.has(c.account_id!) : c.account_id === accountId
    const matchesAdsType = !adsType || c.ads_type === adsType
    return matchesAccount && matchesAdsType
  })
}

export function AdsReportPage() {
  const [filters, setFilters] = useState<AdsReportStatsFilterParams>(DEFAULT_FILTERS)
  const [statsData, setStatsData] = useState<AdsReportStatsData | null>(null)
  const [loading, setLoading] = useState(false)

  const [optionTeams, setOptionTeams] = useState<AdsReportOptionTeam[]>([])
  const [showTeamFilter, setShowTeamFilter] = useState(false)
  const [allCampaigns, setAllCampaigns] = useState<AdsReportOptionCampaign[]>([])

  useEffect(() => {
    void adsReportApi.options().then((res) => {
      setOptionTeams(res.data.data.teams)
      setShowTeamFilter(res.data.data.show_team_filter)
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

        // Dependent filtering logic
        if (field === 'team_id' || field === 'ads_type') {
          next.account_id = null
          next.campaign_ids = []
        }

        if (field === 'account_id') {
          next.campaign_ids = []
        }

        return next
      })
    },
    [optionTeams],
  )

  const onResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const accountOptions = useMemo(
    () => accountsToOptions(getAccountsForFilters(optionTeams, filters.team_id, filters.ads_type)),
    [optionTeams, filters.team_id, filters.ads_type],
  )

  const campaignOptions = useMemo<SelectOption[]>(() => {
    const filteredAccounts = getAccountsForFilters(optionTeams, filters.team_id, filters.ads_type)
    const filteredCampaigns = getCampaignsForFilters(
      allCampaigns,
      filteredAccounts,
      filters.account_id,
      filters.ads_type,
    )

    return filteredCampaigns.map((c) => ({
      value: c.campaign_id,
      label: c.campaign_name ?? c.campaign_id,
    }))
  }, [allCampaigns, optionTeams, filters.team_id, filters.account_id, filters.ads_type])

  const teamOptions = useMemo(() => teamsToOptions(optionTeams), [optionTeams])

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

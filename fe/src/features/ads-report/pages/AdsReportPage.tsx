import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from '@/lib/dayjs'
import { toast } from 'sonner'

import { adsReportApi } from '@/features/ads-report/api'
import { AdsReportSummaryCards } from '@/features/ads-report/components'
import type {
  AdsReportAdsType,
  AdsReportOptionAccount,
  AdsReportOptionCampaign,
  AdsReportOptionMainTeam,
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
import { useAuthStore } from '@/hooks/useAuthStore'

const DEFAULT_FILTERS: AdsReportStatsFilterParams = {
  date_from: dayjs().startOf('month').format('YYYY-MM-DD'),
  date_to: dayjs().endOf('month').format('YYYY-MM-DD'),
  account_ids: [],
  ads_types: [],
  campaign_ids: [],
  main_team_ids: [],
  team_ids: [],
}

function parseDateRange(value: unknown): DateRangeValue | null {
  if (value && typeof value === 'object' && 'from' in value && 'to' in value) {
    const next = value as DateRangeValue
    return { from: next.from ?? null, to: next.to ?? null }
  }
  return null
}

function parseIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => Number(v)).filter((n) => !Number.isNaN(n))
}

function parseStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((v) => String(v)).filter(Boolean)
}

function parseAdsTypes(value: unknown): AdsReportAdsType[] {
  return parseStrings(value).filter((v): v is AdsReportAdsType =>
    ['google', 'tiktok'].includes(v),
  )
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

function mainTeamsToOptions(mainTeams: AdsReportOptionMainTeam[]): SelectOption[] {
  return mainTeams.map((t) => ({ value: String(t.id), label: t.name }))
}

function getAccountsForFilters(
  teams: AdsReportOptionTeam[],
  allAccounts: AdsReportOptionAccount[],
  teamIds: number[] = [],
  adsTypes: AdsReportAdsType[] = [],
  mainTeamIds: number[] = [],
) {
  let accounts: AdsReportOptionAccount[] = []
  if (teamIds.length > 0) {
    const accountMap = new Map<string, AdsReportOptionAccount>()
    const allowedTeamIds = new Set(teamIds)
    teams
      .filter((t) => allowedTeamIds.has(t.id))
      .forEach((t) => {
        t.accounts.forEach((a) => accountMap.set(a.account_id, a))
      })
    accounts = Array.from(accountMap.values())
  } else {
    accounts = allAccounts
  }

  if (adsTypes.length > 0) {
    const allowedAdsTypes = new Set(adsTypes)
    accounts = accounts.filter((a) => allowedAdsTypes.has(a.ads_type as AdsReportAdsType))
  }

  if (mainTeamIds.length > 0) {
    const allowedMainTeamIds = new Set(mainTeamIds)
    accounts = accounts.filter(
      (a) => a.main_team_id !== null && allowedMainTeamIds.has(a.main_team_id),
    )
  }

  return accounts
}

function getCampaignsForFilters(
  campaigns: AdsReportOptionCampaign[],
  accounts: AdsReportOptionAccount[],
  accountIds: string[] = [],
  adsTypes: AdsReportAdsType[] = [],
) {
  const availableAccountIds = new Set(accounts.map((a) => a.account_id))
  const selectedAccountIds = new Set(accountIds)
  const selectedAdsTypes = new Set(adsTypes)

  return campaigns.filter((c) => {
    const matchesAccount =
      accountIds.length === 0
        ? availableAccountIds.has(c.account_id!)
        : c.account_id !== null && selectedAccountIds.has(c.account_id)
    const matchesAdsType =
      adsTypes.length === 0 ||
      (c.ads_type !== null && selectedAdsTypes.has(c.ads_type as AdsReportAdsType))
    return matchesAccount && matchesAdsType
  })
}

export function AdsReportPage() {
  const canUseMainTeams = useAuthStore((state) =>
    Boolean(state.user?.is_main_system && state.user.can_view_ads_report_unscoped),
  )
  const [filters, setFilters] = useState<AdsReportStatsFilterParams>(DEFAULT_FILTERS)
  const [statsData, setStatsData] = useState<AdsReportStatsData | null>(null)
  const [loading, setLoading] = useState(false)

  const [mainTeamOptions, setMainTeamOptions] = useState<SelectOption[]>([])
  const [allAccounts, setAllAccounts] = useState<AdsReportOptionAccount[]>([])
  const [optionTeams, setOptionTeams] = useState<AdsReportOptionTeam[]>([])
  const [showTeamFilter, setShowTeamFilter] = useState(false)
  const [allCampaigns, setAllCampaigns] = useState<AdsReportOptionCampaign[]>([])

  useEffect(() => {
    void adsReportApi.options().then((res) => {
      setAllAccounts(res.data.data.accounts)
      setMainTeamOptions(mainTeamsToOptions(res.data.data.main_teams))
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

        if (field === 'team_ids') {
          next.team_ids = parseIds(value)
        }

        if (field === 'main_team_ids') {
          next.main_team_ids = canUseMainTeams ? parseIds(value) : []
        }

        if (field === 'ads_types') {
          next.ads_types = parseAdsTypes(value)
        }

        if (field === 'account_ids') {
          next.account_ids = parseStrings(value)
        }

        if (field === 'campaign_ids') {
          next.campaign_ids = parseStrings(value)
        }

        // Dependent filtering logic
        if (field === 'team_ids' || field === 'ads_types' || field === 'main_team_ids') {
          next.account_ids = []
          next.campaign_ids = []
        }

        if (field === 'account_ids') {
          next.campaign_ids = []
        }

        return next
      })
    },
    [canUseMainTeams],
  )

  const onResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const accountOptions = useMemo(
    () =>
      accountsToOptions(
        getAccountsForFilters(
          optionTeams,
          allAccounts,
          filters.team_ids ?? [],
          filters.ads_types ?? [],
          canUseMainTeams ? (filters.main_team_ids ?? []) : [],
        ),
      ),
    [
      allAccounts,
      canUseMainTeams,
      optionTeams,
      filters.team_ids,
      filters.ads_types,
      filters.main_team_ids,
    ],
  )

  const campaignOptions = useMemo<SelectOption[]>(() => {
    const filteredAccounts = getAccountsForFilters(
      optionTeams,
      allAccounts,
      filters.team_ids ?? [],
      filters.ads_types ?? [],
      canUseMainTeams ? (filters.main_team_ids ?? []) : [],
    )
    const filteredCampaigns = getCampaignsForFilters(
      allCampaigns,
      filteredAccounts,
      filters.account_ids ?? [],
      filters.ads_types ?? [],
    )

    return filteredCampaigns.map((c) => ({
      value: c.campaign_id,
      label: c.campaign_name ?? c.campaign_id,
    }))
  }, [
    allAccounts,
    allCampaigns,
    canUseMainTeams,
    optionTeams,
    filters.team_ids,
    filters.account_ids,
    filters.ads_types,
    filters.main_team_ids,
  ])

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

    if (canUseMainTeams) {
      fields.push({
        field: 'main_team_ids',
        label: 'Main Teams',
        type: 'multiselect',
        value: filters.main_team_ids?.map(String) ?? [],
        options: mainTeamOptions,
        placeholder: 'All main teams',
      })
    }

    if (showTeamFilter) {
      fields.push({
        field: 'team_ids',
        label: 'Teams',
        type: 'multiselect',
        value: filters.team_ids?.map(String) ?? [],
        options: teamOptions,
        placeholder: 'All teams',
      })
    }

    fields.push(
      {
        field: 'ads_types',
        label: 'Ads Types',
        type: 'multiselect',
        value: filters.ads_types ?? [],
        options: [
          { value: 'google', label: 'Google' },
          { value: 'tiktok', label: 'TikTok' },
        ],
        placeholder: 'All types',
      },
      {
        field: 'account_ids',
        label: 'Accounts',
        type: 'multiselect',
        value: filters.account_ids ?? [],
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
  }, [
    accountOptions,
    campaignOptions,
    canUseMainTeams,
    filters,
    mainTeamOptions,
    showTeamFilter,
    teamOptions,
  ])

  return (
    <div className="space-y-6">
      <FilterPanel fields={filterFields} onReset={onResetFilters} onFieldChange={onFieldChange} />

      <AdsReportSummaryCards data={statsData} loading={loading} />
    </div>
  )
}

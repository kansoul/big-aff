import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { teamReportApi } from '@/features/team-report/api'
import type {
  TeamReportByTeamRow,
  TeamReportByUserRow,
  TeamOverviewData,
  TeamReportFilterParams,
} from '@/features/team-report/types'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import type { DateRangeValue } from '@/components/ui/date-range-picker-presets'
import { teamsApi } from '@/features/teams/api'
import { usersApi } from '@/features/users/api/users'
import type { SelectOption } from '@/components/common/FilterPanel'
import { TeamOverviewCard } from '../components/TeamOverviewCard'
import { TeamReportByTeamTableCard } from '../components/TeamByTeamTableCard'
import { TeamReportByUserTableCard } from '../components/TeamByUserTableCard'

const DEFAULT_FILTERS: TeamReportFilterParams = {
  date_from: dayjs().startOf('month').format('YYYY-MM-DD'),
  date_to: dayjs().endOf('month').format('YYYY-MM-DD'),
  team_ids: [],
  user_ids: [],
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

function toSelectOptions(items: { id: number; name: string }[]): SelectOption[] {
  return items.map((item) => ({ value: String(item.id), label: item.name }))
}

export function TeamReportPage() {
  const [filters, setFilters] = useState<TeamReportFilterParams>(DEFAULT_FILTERS)

  const [teamOptions, setTeamOptions] = useState<SelectOption[]>([])
  const [userOptions, setUserOptions] = useState<SelectOption[]>([])

  const [overview, setOverview] = useState<TeamOverviewData | null>(null)
  const [byTeam, setByTeam] = useState<TeamReportByTeamRow[]>([])
  const [byUser, setByUser] = useState<TeamReportByUserRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void Promise.all([teamsApi.listOptions(), usersApi.listOptions()]).then(
      ([teamsRes, usersRes]) => {
        setTeamOptions(toSelectOptions(teamsRes.data.data))
        setUserOptions(toSelectOptions(usersRes.data.data))
      },
    )
  }, [])

  const loadData = useCallback(async (activeFilters: TeamReportFilterParams) => {
    try {
      setLoading(true)
      const [overviewRes, byTeamRes, byUserRes] = await Promise.all([
        teamReportApi.overview(activeFilters),
        teamReportApi.byTeam(activeFilters),
        teamReportApi.byUser(activeFilters),
      ])
      setOverview(overviewRes.data.data)
      setByTeam(byTeamRes.data.data)
      setByUser(byUserRes.data.data)
    } catch {
      toast.error('Failed to load data.')
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
      team_ids: parseIds(values.team_ids),
      user_ids: parseIds(values.user_ids),
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
        field: 'team_ids',
        label: 'Team',
        type: 'multiselect',
        value: filters.team_ids?.map(String) ?? [],
        options: teamOptions,
        placeholder: 'All teams',
      },
      {
        field: 'user_ids',
        label: 'User',
        type: 'multiselect',
        value: filters.user_ids?.map(String) ?? [],
        options: userOptions,
        placeholder: 'All users',
      },
    ],
    [filters, teamOptions, userOptions],
  )

  return (
    <div className="space-y-6">
      <FilterPanel
        fields={filterFields}
        onReset={onResetFilters}
        applyMode
        onApply={onApplyFilters}
      />
      <TeamOverviewCard data={overview} loading={loading} />
      <TeamReportByTeamTableCard data={byTeam} loading={loading} />
      <TeamReportByUserTableCard data={byUser} loading={loading} />
    </div>
  )
}

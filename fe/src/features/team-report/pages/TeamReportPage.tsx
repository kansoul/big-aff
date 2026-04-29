import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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

// ─── URL helpers ──────────────────────────────────────────────────────────────

function parseFiltersFromUrl(params: URLSearchParams): TeamReportFilterParams {
  const teamIds = params
    .getAll('team_ids[]')
    .map(Number)
    .filter((n) => !Number.isNaN(n))
  const userIds = params
    .getAll('user_ids[]')
    .map(Number)
    .filter((n) => !Number.isNaN(n))
  return {
    date_from: params.get('date_from') ?? DEFAULT_FILTERS.date_from,
    date_to: params.get('date_to') ?? DEFAULT_FILTERS.date_to,
    team_ids: teamIds,
    user_ids: userIds,
  }
}

function buildUrlParams(filters: TeamReportFilterParams): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.date_from) params.set('date_from', filters.date_from)
  if (filters.date_to) params.set('date_to', filters.date_to)
  ;(filters.team_ids ?? []).forEach((id) => params.append('team_ids[]', String(id)))
  ;(filters.user_ids ?? []).forEach((id) => params.append('user_ids[]', String(id)))
  return params
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function parseOptionalId(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function toSelectOptions(items: { id: number; name: string }[]): SelectOption[] {
  return items.map((item) => ({ value: String(item.id), label: item.name }))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TeamReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [filters, setFilters] = useState<TeamReportFilterParams>(() =>
    parseFiltersFromUrl(searchParams),
  )

  const isMounted = useRef(false)
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }
    setSearchParams(buildUrlParams(filters), { replace: true })
  }, [filters, setSearchParams])

  const [selectedTeamIdForOptions, setSelectedTeamIdForOptions] = useState<number | null>(() => {
    const [teamId] = parseFiltersFromUrl(searchParams).team_ids ?? []
    return teamId ?? null
  })

  const [teamOptions, setTeamOptions] = useState<SelectOption[]>([])
  const [userOptions, setUserOptions] = useState<SelectOption[]>([])

  const [overview, setOverview] = useState<TeamOverviewData | null>(null)
  const [byTeam, setByTeam] = useState<TeamReportByTeamRow[]>([])
  const [byUser, setByUser] = useState<TeamReportByUserRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void teamReportApi
      .teamOptions()
      .then((response) => {
        setTeamOptions(toSelectOptions(response.data.data))
      })
      .catch(() => {
        toast.error('Failed to load team options.')
      })
  }, [])

  const selectedTeamId = useMemo(() => {
    const [teamId] = filters.team_ids ?? []
    return teamId ?? null
  }, [filters.team_ids])

  useEffect(() => {
    setSelectedTeamIdForOptions(selectedTeamId)
  }, [selectedTeamId])

  useEffect(() => {
    if (!selectedTeamIdForOptions) {
      setUserOptions([])
      return
    }

    void teamReportApi
      .userOptions(selectedTeamIdForOptions)
      .then((response) => {
        setUserOptions(toSelectOptions(response.data.data))
      })
      .catch(() => {
        setUserOptions([])
        toast.error('Failed to load user options.')
      })
  }, [selectedTeamIdForOptions])

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
    const nextTeamId = parseOptionalId(values.team_id)
    const nextUserIds = parseIds(values.user_ids)

    setFilters({
      date_from: range?.from ?? null,
      date_to: range?.to ?? null,
      team_ids: nextTeamId ? [nextTeamId] : [],
      user_ids: nextTeamId ? nextUserIds : [],
    })
  }, [])

  const onResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setSelectedTeamIdForOptions(null)
  }, [])

  const onDraftFieldChange = useCallback((field: string, value: unknown) => {
    if (field !== 'team_id') {
      return
    }

    setSelectedTeamIdForOptions(parseOptionalId(value))
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
        field: 'team_id',
        label: 'Team',
        type: 'select',
        value: selectedTeamIdForOptions ? String(selectedTeamIdForOptions) : null,
        options: teamOptions,
        placeholder: 'All teams',
      },
      {
        field: 'user_ids',
        label: 'User',
        type: 'multiselect',
        value: filters.user_ids?.map(String) ?? [],
        options: userOptions,
        disabled: !selectedTeamIdForOptions,
        placeholder: selectedTeamIdForOptions
          ? 'All users in selected team'
          : 'Select a team first',
      },
    ],
    [filters, selectedTeamIdForOptions, teamOptions, userOptions],
  )

  return (
    <div className="space-y-6">
      <FilterPanel
        fields={filterFields}
        onReset={onResetFilters}
        applyMode
        onDraftFieldChange={onDraftFieldChange}
        onApply={onApplyFilters}
      />
      <TeamOverviewCard data={overview} loading={loading} />
      <TeamReportByTeamTableCard data={byTeam} loading={loading} />
      <TeamReportByUserTableCard data={byUser} loading={loading} />
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import dayjs from '@/lib/dayjs'
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
import { useAuthStore } from '@/hooks/useAuthStore'
import { TeamOverviewCard } from '../components/TeamOverviewCard'
import { TeamReportByTeamTableCard } from '../components/TeamByTeamTableCard'
import { TeamReportByUserTableCard } from '../components/TeamByUserTableCard'

const DEFAULT_FILTERS: TeamReportFilterParams = {
  date_from: dayjs().startOf('month').format('YYYY-MM-DD'),
  date_to: dayjs().endOf('month').format('YYYY-MM-DD'),
  main_team_ids: [],
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
  const mainTeamIds = params
    .getAll('main_team_ids[]')
    .map(Number)
    .filter((n) => !Number.isNaN(n))
  return {
    date_from: params.get('date_from') ?? DEFAULT_FILTERS.date_from,
    date_to: params.get('date_to') ?? DEFAULT_FILTERS.date_to,
    main_team_ids: mainTeamIds,
    team_ids: teamIds,
    user_ids: userIds,
  }
}

function buildUrlParams(filters: TeamReportFilterParams): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.date_from) params.set('date_from', filters.date_from)
  if (filters.date_to) params.set('date_to', filters.date_to)
  ;(filters.main_team_ids ?? []).forEach((id) => params.append('main_team_ids[]', String(id)))
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

function toSelectOptions(items: { id: number; name: string }[]): SelectOption[] {
  return items.map((item) => ({ value: String(item.id), label: item.name }))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TeamReportPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const isMainSystem = useAuthStore((state) => Boolean(state.user?.is_main_system))

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

  const [selectedTeamIdsForOptions, setSelectedTeamIdsForOptions] = useState<number[]>(() => {
    return parseFiltersFromUrl(searchParams).team_ids ?? []
  })

  const [mainTeamOptions, setMainTeamOptions] = useState<SelectOption[]>([])
  const [teamOptions, setTeamOptions] = useState<SelectOption[]>([])
  const [userOptions, setUserOptions] = useState<SelectOption[]>([])

  const [overview, setOverview] = useState<TeamOverviewData | null>(null)
  const [byTeam, setByTeam] = useState<TeamReportByTeamRow[]>([])
  const [byUser, setByUser] = useState<TeamReportByUserRow[]>([])
  const [loading, setLoading] = useState(false)
  const effectiveFilters = useMemo<TeamReportFilterParams>(
    () => (isMainSystem ? filters : { ...filters, main_team_ids: [] }),
    [filters, isMainSystem],
  )

  useEffect(() => {
    if (!isMainSystem) {
      return
    }

    void teamReportApi
      .mainTeamOptions()
      .then((response) => {
        setMainTeamOptions(toSelectOptions(response.data.data))
      })
      .catch(() => {
        toast.error('Failed to load main team options.')
      })
  }, [isMainSystem])

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

  useEffect(() => {
    setSelectedTeamIdsForOptions(filters.team_ids ?? [])
  }, [filters.team_ids])

  useEffect(() => {
    if (selectedTeamIdsForOptions.length === 0) {
      setUserOptions([])
      return
    }

    void teamReportApi
      .userOptions(selectedTeamIdsForOptions)
      .then((response) => {
        setUserOptions(toSelectOptions(response.data.data))
      })
      .catch(() => {
        setUserOptions([])
        toast.error('Failed to load user options.')
      })
  }, [selectedTeamIdsForOptions])

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
    void loadData(effectiveFilters)
  }, [loadData, effectiveFilters])

  const onApplyFilters = useCallback((values: Record<string, unknown>) => {
    const range = parseDateRange(values.date_range)
    const nextMainTeamIds = parseIds(values.main_team_ids)
    const nextTeamIds = parseIds(values.team_ids)
    const nextUserIds = parseIds(values.user_ids)

    setFilters({
      date_from: range?.from ?? null,
      date_to: range?.to ?? null,
      main_team_ids: nextMainTeamIds,
      team_ids: nextTeamIds,
      user_ids: nextTeamIds.length > 0 ? nextUserIds : [],
    })
  }, [])

  const onResetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setSelectedTeamIdsForOptions([])
  }, [])

  const onDraftFieldChange = useCallback((field: string, value: unknown) => {
    if (field !== 'team_ids') {
      return
    }

    setSelectedTeamIdsForOptions(parseIds(value))
  }, [])

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

    if (isMainSystem) {
      fields.push({
        field: 'main_team_ids',
        label: 'Main Teams',
        type: 'multiselect',
        value: filters.main_team_ids?.map(String) ?? [],
        options: mainTeamOptions,
        placeholder: 'All main teams',
      })
    }

    fields.push(
      {
        field: 'team_ids',
        label: 'Teams',
        type: 'multiselect',
        value: selectedTeamIdsForOptions.map(String),
        options: teamOptions,
        placeholder: 'All teams',
      },
      {
        field: 'user_ids',
        label: 'User',
        type: 'multiselect',
        value: filters.user_ids?.map(String) ?? [],
        options: userOptions,
        disabled: selectedTeamIdsForOptions.length === 0,
        placeholder:
          selectedTeamIdsForOptions.length > 0
            ? 'All users in selected teams'
            : 'Select teams first',
      },
    )

    return fields
  }, [filters, isMainSystem, mainTeamOptions, selectedTeamIdsForOptions, teamOptions, userOptions])

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
      <TeamReportByUserTableCard data={byUser} loading={loading} filters={filters} />
    </div>
  )
}

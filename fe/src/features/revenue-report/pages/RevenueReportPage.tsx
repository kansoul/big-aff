import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { toast } from 'sonner'

import { revenueReportApi } from '@/features/revenue-report/api'
import {
  RevenueByTeamTableCard,
  RevenueByUserTableCard,
  RevenueOverviewCard,
} from '@/features/revenue-report/components'
import type {
  RevenueByTeamRow,
  RevenueByUserRow,
  RevenueOverviewData,
  RevenueReportFilterParams,
} from '@/features/revenue-report/types'
import { FilterPanel, type FilterFieldDef } from '@/components/common/FilterPanel'
import type { DateRangeValue } from '@/components/ui/date-range-picker-presets'
import { teamsApi } from '@/features/teams/api'
import { usersApi } from '@/features/users/api/users'
import type { SelectOption } from '@/components/common/FilterPanel'

const DEFAULT_FILTERS: RevenueReportFilterParams = {
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

export function RevenueReportPage() {
  const [filters, setFilters] = useState<RevenueReportFilterParams>(DEFAULT_FILTERS)

  const [teamOptions, setTeamOptions] = useState<SelectOption[]>([])
  const [userOptions, setUserOptions] = useState<SelectOption[]>([])

  const [overview, setOverview] = useState<RevenueOverviewData | null>(null)
  const [byTeam, setByTeam] = useState<RevenueByTeamRow[]>([])
  const [byUser, setByUser] = useState<RevenueByUserRow[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void Promise.all([teamsApi.listOptions(), usersApi.listOptions()]).then(
      ([teamsRes, usersRes]) => {
        setTeamOptions(toSelectOptions(teamsRes.data.data))
        setUserOptions(toSelectOptions(usersRes.data.data))
      },
    )
  }, [])

  const loadData = useCallback(async (activeFilters: RevenueReportFilterParams) => {
    try {
      setLoading(true)
      const [overviewRes, byTeamRes, byUserRes] = await Promise.all([
        revenueReportApi.overview(activeFilters),
        revenueReportApi.byTeam(activeFilters),
        revenueReportApi.byUser(activeFilters),
      ])
      setOverview(overviewRes.data.data)
      setByTeam(byTeamRes.data.data)
      setByUser(byUserRes.data.data)
    } catch {
      toast.error('Failed to load revenue report data.')
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

      <RevenueOverviewCard data={overview} loading={loading} />

      <RevenueByTeamTableCard data={byTeam} loading={loading} />

      <RevenueByUserTableCard data={byUser} loading={loading} />
    </div>
  )
}

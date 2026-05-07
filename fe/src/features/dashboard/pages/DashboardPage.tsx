import dayjs from '@/lib/dayjs'
import { Activity, ArrowUpRight, Calendar, Network, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { hasPermission, PermissionSlugs } from '@/constants/permissions'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { dashboardApi } from '@/features/dashboard/api'
import type {
  InsightStatsData,
  RevenueMainTeamRow,
  RevenueStats,
  RevenueTableData,
  RevenueTeamRow,
} from '@/features/dashboard/types'
import { useAuthStore } from '@/hooks/useAuthStore'

// ── helpers ──────────────────────────────────────────────────────────────────

const AUTO_REFETCH_INTERVAL_MS = 60_000

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(val)

// ── sub-components ────────────────────────────────────────────────────────────

const ProfitCell = ({ value }: { value: number }) => (
  <span
    className={`text-xs md:text-sm font-semibold ${value > 0 ? 'text-emerald-500 dark:text-emerald-400' : value < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-muted-foreground'}`}
  >
    {formatCurrency(value)}
  </span>
)

const MAIN_TEAM_PERIODS = [
  { key: 'today', label: 'Today', badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400' },
  {
    key: 'yesterday',
    label: 'Yesterday',
    badgeClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  },
  {
    key: 'this_month',
    label: 'This Month',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  {
    key: 'last_month',
    label: 'Last Month',
    badgeClass: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300',
  },
] as const

type MainTeamPeriodKey = (typeof MAIN_TEAM_PERIODS)[number]['key']

function topMainTeamByProfit(rows: RevenueMainTeamRow[], period: MainTeamPeriodKey) {
  return rows.reduce<RevenueMainTeamRow | null>((best, row) => {
    if (!best) return row
    return row[period].profit > best[period].profit ? row : best
  }, null)
}

function MainTeamLeaderBadge({
  label,
  row,
  stats,
  loading,
}: {
  label: string
  row: RevenueMainTeamRow | null
  stats?: RevenueStats
  loading: boolean
}) {
  const goldMedal = (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10 text-lg">
      🥇
    </div>
  )

  if (loading) {
    return <Skeleton className="h-24 w-full rounded-xl sm:w-80" />
  }

  if (!row || !stats) {
    return (
      <div className="flex min-h-24 w-full items-center gap-4 rounded-xl border border-border/60 bg-card px-5 py-4 text-card-foreground shadow-sm dark:border-zinc-900 dark:bg-zinc-950 dark:text-white sm:w-80">
        {goldMedal}
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-wide text-yellow-600 dark:text-yellow-400">
            {label}
          </div>
          <div className="mt-1 text-lg font-black text-foreground dark:text-white">No data</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-24 w-full items-center gap-4 rounded-xl border border-border/60 bg-card px-5 py-4 text-card-foreground shadow-sm dark:border-zinc-900 dark:bg-zinc-950 dark:text-white sm:w-80">
      {goldMedal}
      <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-1">
        <div className="col-span-2 text-xs font-black uppercase tracking-wide text-yellow-600 dark:text-yellow-400">
          {label}
        </div>
        <div className="col-span-2 truncate text-lg font-black text-foreground dark:text-white">
          {row.main_team_name}
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground dark:text-zinc-500">Profit</div>
          <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(stats.profit)}
          </div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground dark:text-zinc-500">ROI</div>
          <div className="text-base font-black text-emerald-600 dark:text-emerald-400">
            {stats.roi.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  )
}

function MainTeamStatsCells({ stats }: { stats: RevenueStats }) {
  return (
    <>
      <TableCell className="text-xs font-medium text-foreground">
        {formatCurrency(stats.revenue)}
      </TableCell>
      <TableCell className="text-xs font-medium text-foreground">
        {formatCurrency(stats.spend)}
      </TableCell>
      <TableCell>
        <ProfitCell value={stats.profit} />
      </TableCell>
      <TableCell>
        <span
          className={`text-xs font-semibold ${stats.roi >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
        >
          {stats.roi.toFixed(2)}%
        </span>
      </TableCell>
    </>
  )
}

function sumPeriodStats(rows: RevenueMainTeamRow[], period: MainTeamPeriodKey): RevenueStats {
  const revenue = rows.reduce((s, r) => s + r[period].revenue, 0)
  const spend = rows.reduce((s, r) => s + r[period].spend, 0)
  const profit = revenue - spend
  return { revenue, spend, profit, roi: spend > 0 ? (profit / spend) * 100 : 0 }
}

function MainTeamTopTable({ rows, loading }: { rows: RevenueMainTeamRow[]; loading: boolean }) {
  const topToday = topMainTeamByProfit(rows, 'today')
  const topMonth = topMainTeamByProfit(rows, 'this_month')

  return (
    <Card className="mt-0 flex flex-col overflow-hidden rounded-2xl border-border/50 bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border/50 bg-muted/20 px-2 py-5 md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
              <Network className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Main Team Top</CardTitle>
              <CardDescription className="mt-1 text-sm">
                Revenue, spend, profit and ROI grouped by main team
              </CardDescription>
            </div>
          </div>

          <div className="grid w-full min-w-0 gap-3 sm:grid-cols-2 lg:w-auto">
            <MainTeamLeaderBadge
              label="#1 Daily Profit"
              row={topToday}
              stats={topToday?.today}
              loading={loading}
            />
            <MainTeamLeaderBadge
              label="#1 Monthly Profit"
              row={topMonth}
              stats={topMonth?.this_month}
              loading={loading}
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table className="whitespace-nowrap">
          <TableHeader>
            <TableRow className="border-b-0 bg-muted/10 hover:bg-muted/10">
              <TableHead
                rowSpan={2}
                className="sticky left-0 z-20 w-[180px] border-r border-border/30 bg-card px-3 py-3 align-middle text-xs font-semibold text-muted-foreground md:px-6"
              >
                Main Team
              </TableHead>
              {MAIN_TEAM_PERIODS.map((period) => (
                <TableHead
                  key={period.key}
                  colSpan={4}
                  className="border-l border-b border-border/30 py-2.5 text-center font-semibold text-foreground"
                >
                  <span className="inline-flex items-center gap-2">
                    {period.label}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${period.badgeClass}`}
                    >
                      {period.label}
                    </span>
                  </span>
                </TableHead>
              ))}
            </TableRow>
            <TableRow className="border-b border-border/50 bg-muted/10 hover:bg-muted/10">
              {MAIN_TEAM_PERIODS.flatMap((period) =>
                ['Revenue', 'Spend', 'Profit', 'ROI %'].map((label, index) => (
                  <TableHead
                    key={`${period.key}-${label}`}
                    className={`w-32 py-2.5 text-xs font-semibold text-muted-foreground ${index === 0 ? 'border-l border-border/30' : ''}`}
                  >
                    {label}
                  </TableHead>
                )),
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell className="sticky left-0 z-10 border-r border-border/30 bg-card px-3 py-3 md:px-6">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    {Array.from({ length: 16 }).map((__, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : rows.map((row) => (
                  <TableRow key={row.main_team_id} className="border-b border-border/30">
                    <TableCell className="sticky left-0 z-10 border-r border-border/30 bg-card px-3 py-3 text-xs font-semibold text-foreground md:px-6">
                      <span className="block max-w-48 truncate" title={row.main_team_name}>
                        {row.main_team_name}
                      </span>
                    </TableCell>
                    {MAIN_TEAM_PERIODS.map((period) => (
                      <MainTeamStatsCells key={period.key} stats={row[period.key]} />
                    ))}
                  </TableRow>
                ))}
            {!loading && rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={17}
                  className="px-3 py-8 text-center text-xs text-muted-foreground"
                >
                  No data
                </TableCell>
              </TableRow>
            ) : null}
            {!loading && rows.length > 0 && (
              <TableRow className="border-t-2 border-border bg-muted/10 font-bold">
                <TableCell className="sticky left-0 z-10 border-r border-border/30 bg-card px-3 py-3 md:px-6">
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-foreground">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    Summary
                  </span>
                </TableCell>
                {MAIN_TEAM_PERIODS.map((period) => (
                  <MainTeamStatsCells key={period.key} stats={sumPeriodStats(rows, period.key)} />
                ))}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}

// ── page ──────────────────────────────────────────────────────────────────────

interface StatsCardData {
  title: string
  primaryLabel: string
  primaryValue: string
  secondaryLabel: string
  secondaryValue: string
  color: 'emerald' | 'blue'
  chartData: { value: number }[]
}

const EMPTY_CARD = (
  title: string,
  primaryLabel: string,
  secondaryLabel: string,
  color: 'emerald' | 'blue',
): StatsCardData => ({
  title,
  primaryLabel,
  primaryValue: '$0.00',
  secondaryLabel,
  secondaryValue: '$0.00',
  color,
  chartData: [],
})

const INITIAL_STATS: StatsCardData[] = [
  EMPTY_CARD('Daily Revenue', 'Today', 'Yesterday', 'emerald'),
  EMPTY_CARD('Weekly Revenue', 'This Week', 'Last Week', 'emerald'),
  EMPTY_CARD('Monthly Revenue', 'This Month', 'Last Month', 'emerald'),
  EMPTY_CARD('Daily Spend', 'Today', 'Yesterday', 'blue'),
  EMPTY_CARD('Weekly Spend', 'This Week', 'Last Week', 'blue'),
  EMPTY_CARD('Monthly Spend', 'This Month', 'Last Month', 'blue'),
]

function buildStatsCards(stats: InsightStatsData): StatsCardData[] {
  const make = (
    current: number,
    previous: number,
    title: string,
    primaryLabel: string,
    secondaryLabel: string,
    color: 'emerald' | 'blue',
  ): StatsCardData => ({
    title,
    primaryLabel,
    primaryValue: formatCurrency(current),
    secondaryLabel,
    secondaryValue: formatCurrency(previous),
    color,
    chartData: [{ value: previous }, { value: current }],
  })

  return [
    make(
      stats.daily_revenue.today,
      stats.daily_revenue.yesterday,
      'Daily Revenue',
      'Today',
      'Yesterday',
      'emerald',
    ),
    make(
      stats.weekly_revenue.this_week,
      stats.weekly_revenue.last_week,
      'Weekly Revenue',
      'This Week',
      'Last Week',
      'emerald',
    ),
    make(
      stats.monthly_revenue.this_month,
      stats.monthly_revenue.last_month,
      'Monthly Revenue',
      'This Month',
      'Last Month',
      'emerald',
    ),
    make(
      stats.daily_spend.today,
      stats.daily_spend.yesterday,
      'Daily Spend',
      'Today',
      'Yesterday',
      'blue',
    ),
    make(
      stats.weekly_spend.this_week,
      stats.weekly_spend.last_week,
      'Weekly Spend',
      'This Week',
      'Last Week',
      'blue',
    ),
    make(
      stats.monthly_spend.this_month,
      stats.monthly_spend.last_month,
      'Monthly Spend',
      'This Month',
      'Last Month',
      'blue',
    ),
  ]
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions])
  const canViewStats = useMemo(
    () => hasPermission(permissions, PermissionSlugs.DashboardStatView),
    [permissions],
  )
  const canViewTeamTable = useMemo(
    () => hasPermission(permissions, PermissionSlugs.DashboardTeamView),
    [permissions],
  )
  const canViewUserTable = useMemo(
    () => hasPermission(permissions, PermissionSlugs.DashboardUserView),
    [permissions],
  )
  const canViewMainTeamTable = Boolean(user?.is_admin && user?.is_main_system)

  const canLoadRevenueTable = canViewTeamTable || canViewUserTable || canViewMainTeamTable

  const [statsLoading, setStatsLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(true)
  const [statsCards, setStatsCards] = useState<StatsCardData[]>(INITIAL_STATS)
  const [rawStats, setRawStats] = useState<InsightStatsData | null>(null)
  const [revenueTable, setRevenueTable] = useState<RevenueTableData | null>(null)

  // ── load 6 stats cards ───────────────────────────────────────────────────
  const loadStats = useCallback(
    async (options?: { showLoading?: boolean }) => {
      const showLoading = options?.showLoading ?? true

      if (!canViewStats) {
        setStatsCards(INITIAL_STATS)
        if (showLoading) setStatsLoading(false)
        return
      }

      try {
        if (showLoading) setStatsLoading(true)
        const res = await dashboardApi.insightStats()
        setStatsCards(buildStatsCards(res.data.data))
        setRawStats(res.data.data)
      } catch {
        if (showLoading) toast.error('Failed to load dashboard stats.')
      } finally {
        if (showLoading) setStatsLoading(false)
      }
    },
    [canViewStats],
  )

  // ── load revenue table (teams/users permission) ──────────────────────────
  const loadRevenueTable = useCallback(
    async (options?: { showLoading?: boolean }) => {
      const showLoading = options?.showLoading ?? true

      if (!canLoadRevenueTable) {
        setRevenueTable(null)
        if (showLoading) setTableLoading(false)
        return
      }
      try {
        if (showLoading) setTableLoading(true)
        const res = await dashboardApi.revenueTable({ top_limit: 10 })
        setRevenueTable(res.data.data)
      } catch {
        if (showLoading) toast.error('Failed to load team revenue data.')
      } finally {
        if (showLoading) setTableLoading(false)
      }
    },
    [canLoadRevenueTable],
  )

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  useEffect(() => {
    void loadRevenueTable()
  }, [loadRevenueTable])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadStats({ showLoading: false })
      void loadRevenueTable({ showLoading: false })
    }, AUTO_REFETCH_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [loadStats, loadRevenueTable])

  // ── derived insight cards ────────────────────────────────────────────────
  const teams = useMemo((): RevenueTeamRow[] => revenueTable?.by_team ?? [], [revenueTable])
  const topMainTeams = useMemo(
    (): RevenueMainTeamRow[] => revenueTable?.top_main_teams ?? [],
    [revenueTable],
  )

  const yesterdayTotals = useMemo(() => {
    const revenue = teams.reduce((s, r) => s + r.yesterday.revenue, 0)
    const spend = teams.reduce((s, r) => s + r.yesterday.spend, 0)
    const profit = teams.reduce((s, r) => s + r.yesterday.profit, 0)
    const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0
    return { revenue, spend, profit, roi }
  }, [teams])

  return (
    <div className="flex flex-col gap-6 pb-8 animate-in fade-in duration-500">
      {!user?.is_main_system && (
        <div className="hidden relative overflow-hidden md:flex flex-col md:flex-row justify-between items-start md:items-center gap-8 p-8 sm:p-10 rounded-3xl border border-border/50 shadow-sm bg-zinc-950 text-white">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-emerald-500/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none" />

          <div className="relative z-10 w-full lg:w-2/3">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-semibold tracking-wide uppercase text-zinc-100">
                Live Dashboard
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Welcome to the Workspace
            </h1>
            <p className="text-zinc-300 text-base sm:text-lg max-w-xl leading-relaxed">
              {canViewStats ? (
                <>
                  Your campaigns are running. Monthly revenue this month:{' '}
                  <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
                    <ArrowUpRight className="w-4 h-4" />
                    {statsLoading ? '...' : statsCards[2]?.primaryValue}
                  </span>
                </>
              ) : (
                'Your dashboard sections are shown based on your permissions.'
              )}
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row md:flex-col lg:flex-row items-center gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              className="w-full md:w-auto gap-2 rounded-xl h-12 px-6 border-white/20 hover:bg-white/10 bg-white/5 text-white backdrop-blur-md transition-all shadow-sm"
            >
              <Calendar className="h-4 w-4" />
              <span className="font-semibold">{dayjs().format('MMM D, YYYY')}</span>
            </Button>
          </div>
        </div>
      )}
      {/* Stats Summary Cards */}
      {canViewStats && (
        <div className="grid gap-4 lg:grid-cols-3">
          {(
            [
              // mobile order: 1,2,3,4,5,6 — desktop order (lg): col1=Today/Yesterday, col2=ThisWeek/LastWeek, col3=ThisMonth/LastMonth
              {
                label: 'Today',
                badge: 'Daily',
                badgeClass: 'bg-blue-500/15 text-blue-400',
                iconClass: 'bg-blue-500/15 text-blue-400',
                lgOrder: 'lg:order-1',
                rev: rawStats?.daily_revenue.today ?? 0,
                spend: rawStats?.daily_spend.today ?? 0,
              },
              {
                label: 'Yesterday',
                badge: 'Daily',
                badgeClass: 'bg-blue-500/15 text-blue-400',
                iconClass: 'bg-blue-500/15 text-blue-400',
                lgOrder: 'lg:order-4',
                rev: rawStats?.daily_revenue.yesterday ?? 0,
                spend: rawStats?.daily_spend.yesterday ?? 0,
              },
              {
                label: 'This Week',
                badge: 'Weekly',
                badgeClass: 'bg-indigo-500/15 text-indigo-400',
                iconClass: 'bg-indigo-500/15 text-indigo-400',
                lgOrder: 'lg:order-2',
                rev: rawStats?.weekly_revenue.this_week ?? 0,
                spend: rawStats?.weekly_spend.this_week ?? 0,
              },
              {
                label: 'Last Week',
                badge: 'Weekly',
                badgeClass: 'bg-indigo-500/15 text-indigo-400',
                iconClass: 'bg-indigo-500/15 text-indigo-400',
                lgOrder: 'lg:order-5',
                rev: rawStats?.weekly_revenue.last_week ?? 0,
                spend: rawStats?.weekly_spend.last_week ?? 0,
              },
              {
                label: 'This Month',
                badge: 'Monthly',
                badgeClass: 'bg-emerald-500/15 text-emerald-400',
                iconClass: 'bg-emerald-500/15 text-emerald-400',
                lgOrder: 'lg:order-3',
                rev: rawStats?.monthly_revenue.this_month ?? 0,
                spend: rawStats?.monthly_spend.this_month ?? 0,
              },
              {
                label: 'Last Month',
                badge: 'Monthly',
                badgeClass: 'bg-emerald-500/15 text-emerald-400',
                iconClass: 'bg-emerald-500/15 text-emerald-400',
                lgOrder: 'lg:order-6',
                rev: rawStats?.monthly_revenue.last_month ?? 0,
                spend: rawStats?.monthly_spend.last_month ?? 0,
              },
            ] as const
          ).map(({ label, badge, badgeClass, iconClass, lgOrder, rev, spend }) => {
            const profit = rev - spend
            const roi = spend > 0 ? ((rev - spend) / spend) * 100 : 0
            return (
              <Card
                key={label}
                className={`rounded-2xl border-border/50 shadow-sm bg-card px-2 md:px-4 py-4 flex items-start gap-3 ${lgOrder}`}
              >
                <div className="min-w-0 flex-1 flex items-center gap-x-2 w-full">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg mt-0.5 ${iconClass}`}
                  >
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="w-full min-w-0">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {label}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badgeClass}`}
                      >
                        {badge}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full min-w-0">
                      <div>
                        <p className="text-[10px] text-muted-foreground/70 mb-0.5">Revenue</p>
                        {statsLoading ? (
                          <Skeleton className="h-5 w-16" />
                        ) : (
                          <p className="text-[11px] md:text-sm font-bold text-foreground">
                            {formatCurrency(rev)}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground/70 mb-0.5">Spend</p>
                        {statsLoading ? (
                          <Skeleton className="h-5 w-16" />
                        ) : (
                          <p className="text-[11px] md:text-sm font-bold text-foreground">
                            {formatCurrency(spend)}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground/70 mb-0.5">Profit</p>
                        {statsLoading ? (
                          <Skeleton className="h-5 w-16" />
                        ) : (
                          <p
                            className={`text-[11px] md:text-sm font-bold ${profit > 0 ? 'text-emerald-400' : profit < 0 ? 'text-rose-400' : 'text-muted-foreground'}`}
                          >
                            {formatCurrency(profit)}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground/70 mb-0.5">ROI</p>
                        {statsLoading ? (
                          <Skeleton className="h-5 w-12" />
                        ) : (
                          <p
                            className={`text-[11px] md:text-sm font-bold ${roi > 0 ? 'text-emerald-400' : roi < 0 ? 'text-rose-400' : 'text-muted-foreground'}`}
                          >
                            {roi.toFixed(2)}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      {canViewMainTeamTable && <MainTeamTopTable rows={topMainTeams} loading={tableLoading} />}

      {/* Team Breakdown Table */}
      {canViewTeamTable && (
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden flex flex-col bg-card mt-2">
          {/* Card Header: title + summary stat cards */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-border/50 px-2 md:px-6 py-5 bg-muted/20">
            <div className="shrink-0">
              <CardTitle className="text-xl font-bold">Team Internal</CardTitle>
              <CardDescription className="mt-1 text-sm">
                Revenue, spend, profit and ROI by team
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* TODAY SUMMARY */}
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-3 py-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Today Summary
                    </span>
                    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500">
                      Today
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-nowrap">
                    {tableLoading ? (
                      <>
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/70">Revenue</span>
                          <span className="text-xs font-semibold text-foreground">
                            {formatCurrency(teams.reduce((s, r) => s + r.daily.revenue, 0))}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/70">Spend</span>
                          <span className="text-xs font-semibold text-foreground">
                            {formatCurrency(teams.reduce((s, r) => s + r.daily.spend, 0))}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/70">Profit</span>
                          <span
                            className={`text-xs md:text-sm font-semibold ${teams.reduce((s, r) => s + r.daily.profit, 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                          >
                            {formatCurrency(teams.reduce((s, r) => s + r.daily.profit, 0))}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/70">ROI</span>
                          {(() => {
                            const rev = teams.reduce((s, r) => s + r.daily.revenue, 0)
                            const spend = teams.reduce((s, r) => s + r.daily.spend, 0)
                            const roi = spend > 0 ? ((rev - spend) / spend) * 100 : 0
                            return (
                              <span
                                className={`text-xs md:text-sm font-semibold ${roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                              >
                                {roi.toFixed(2)}%
                              </span>
                            )
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {/* YESTERDAY SUMMARY */}
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-3 py-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Yesterday Summary
                    </span>
                    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500">
                      Yesterday
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-nowrap">
                    {tableLoading ? (
                      <>
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/70">Revenue</span>
                          <span className="text-xs font-semibold text-foreground">
                            {formatCurrency(teams.reduce((s, r) => s + r.yesterday.revenue, 0))}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/70">Spend</span>
                          <span className="text-xs font-semibold text-foreground">
                            {formatCurrency(teams.reduce((s, r) => s + r.yesterday.spend, 0))}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/70">Profit</span>
                          <span
                            className={`text-xs md:text-sm font-semibold ${teams.reduce((s, r) => s + r.yesterday.profit, 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                          >
                            {formatCurrency(teams.reduce((s, r) => s + r.yesterday.profit, 0))}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/70">ROI</span>
                          {(() => {
                            const rev = teams.reduce((s, r) => s + r.yesterday.revenue, 0)
                            const spend = teams.reduce((s, r) => s + r.yesterday.spend, 0)
                            const roi = spend > 0 ? ((rev - spend) / spend) * 100 : 0
                            return (
                              <span
                                className={`text-xs md:text-sm font-semibold ${roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                              >
                                {roi.toFixed(2)}%
                              </span>
                            )
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* MONTH SUMMARY */}
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-3 py-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Month Summary
                    </span>
                    <span className="rounded-full bg-emerald-500/10 px-1 py-0.5 text-[9px] font-semibold text-emerald-500">
                      Current month
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-nowrap">
                    {tableLoading ? (
                      <>
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/70">Revenue</span>
                          <span className="text-xs font-semibold text-foreground">
                            {formatCurrency(teams.reduce((s, r) => s + r.monthly.revenue, 0))}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/70">Spend</span>
                          <span className="text-xs font-semibold text-foreground">
                            {formatCurrency(teams.reduce((s, r) => s + r.monthly.spend, 0))}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/70">Profit</span>
                          <span
                            className={`text-xs md:text-sm font-semibold ${teams.reduce((s, r) => s + r.monthly.profit, 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                          >
                            {formatCurrency(teams.reduce((s, r) => s + r.monthly.profit, 0))}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/70">ROI</span>
                          {(() => {
                            const rev = teams.reduce((s, r) => s + r.monthly.revenue, 0)
                            const spend = teams.reduce((s, r) => s + r.monthly.spend, 0)
                            const roi = spend > 0 ? ((rev - spend) / spend) * 100 : 0
                            return (
                              <span
                                className={`text-xs md:text-sm font-semibold ${roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                              >
                                {roi.toFixed(2)}%
                              </span>
                            )
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto row-stripe">
            <Table className="whitespace-nowrap">
              <TableHeader>
                {/* Group header row */}
                <TableRow className="hover:bg-transparent border-b-0 bg-muted/10">
                  <TableHead
                    rowSpan={2}
                    className="py-3 px-3 md:px-6 text-xs md:text-sm font-semibold text-muted-foreground w-[120px] md:w-[180px] sticky left-0 z-20 sticky-col border-r border-border/30 align-middle"
                  >
                    Team
                  </TableHead>
                  <TableHead
                    colSpan={4}
                    className="text-center font-semibold text-foreground border-l border-b border-border/30 py-2.5"
                  >
                    <span className="inline-flex items-center gap-2">
                      Daily
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-500">
                        Today
                      </span>
                    </span>
                  </TableHead>
                  <TableHead
                    colSpan={4}
                    className="text-center font-semibold text-foreground border-l border-b border-border/30 py-2.5"
                  >
                    <span className="inline-flex items-center gap-2">
                      Yesterday
                      <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-500">
                        Yesterday
                      </span>
                    </span>
                  </TableHead>
                  <TableHead
                    colSpan={4}
                    className="text-center font-semibold text-foreground border-l border-b border-border/30 py-2.5 pr-6"
                  >
                    <span className="inline-flex items-center gap-2">
                      Monthly
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                        Current month
                      </span>
                    </span>
                  </TableHead>
                </TableRow>
                {/* Sub-header row */}
                <TableRow className="hover:bg-transparent border-b border-border/50 bg-muted/10">
                  {(['Daily', 'Yesterday', 'Monthly'] as const).flatMap((period) =>
                    ['Revenue', 'Spend', 'Profit', 'ROI %'].map((label, li) => (
                      <TableHead
                        key={`${period}-${label}`}
                        className={`py-2.5 text-xs font-semibold text-muted-foreground w-32 ${li === 0 ? 'border-l border-border/30' : ''} ${period === 'Monthly' && li === 3 ? 'pr-6' : ''}`}
                      >
                        {label}
                      </TableHead>
                    )),
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {tableLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="px-6 py-4 sticky left-0 z-10 sticky-col border-r border-border/30">
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        {Array.from({ length: 12 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : teams.map((row: RevenueTeamRow) => {
                      const yday = row.yesterday
                      return (
                        <TableRow
                          key={row.team_id}
                          className="border-b border-border/30 transition-colors"
                        >
                          <TableCell className="text-xs md:text-sm px-3 md:px-6 py-3 md:py-4 sticky left-0 z-10 sticky-col font-semibold text-foreground border-r border-border/30">
                            {row.team_name}
                          </TableCell>
                          {/* Daily */}
                          <TableCell className="text-xs md:text-sm px-2 md:px-6 text-foreground font-medium border-l border-border/30">
                            {formatCurrency(row.daily.revenue)}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm text-foreground font-medium">
                            {formatCurrency(row.daily.spend)}
                          </TableCell>
                          <TableCell>
                            <ProfitCell value={row.daily.profit} />
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-xs md:text-sm font-semibold ${row.daily.roi >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
                            >
                              {row.daily.roi.toFixed(2)}%
                            </span>
                          </TableCell>
                          {/* Yesterday */}
                          <TableCell className="text-xs md:text-sm px-2 md:px-6 text-foreground font-medium border-l border-border/30">
                            {formatCurrency(yday.revenue)}
                          </TableCell>
                          <TableCell className="px-2 md:px-6 text-xs md:text-sm text-foreground font-medium">
                            {formatCurrency(yday.spend)}
                          </TableCell>
                          <TableCell>
                            <ProfitCell value={yday.profit} />
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-xs md:text-sm font-semibold ${yday.roi >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
                            >
                              {yday.roi.toFixed(2)}%
                            </span>
                          </TableCell>
                          {/* Monthly */}
                          <TableCell className="text-xs md:text-sm px-2 md:px-6 text-foreground font-medium border-l border-border/30">
                            {formatCurrency(row.monthly.revenue)}
                          </TableCell>
                          <TableCell className="px-2 md:px-6 text-xs md:text-sm text-foreground font-medium">
                            {formatCurrency(row.monthly.spend)}
                          </TableCell>
                          <TableCell>
                            <ProfitCell value={row.monthly.profit} />
                          </TableCell>
                          <TableCell className="pr-6">
                            <span
                              className={`text-xs md:text-sm font-semibold ${row.monthly.roi >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
                            >
                              {row.monthly.roi.toFixed(2)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>

              {!tableLoading && teams.length > 0 && (
                <TableBody>
                  <TableRow data-summary className="border-t-2 border-border">
                    <TableCell className="px-6 py-4 sticky left-0 z-10 sticky-col border-r border-border/30">
                      <span className="inline-flex items-center gap-2 font-bold text-foreground text-sm">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        Summary
                      </span>
                    </TableCell>
                    {/* Daily totals */}
                    <TableCell className="font-bold text-foreground border-l border-border/30">
                      {formatCurrency(teams.reduce((s, r) => s + r.daily.revenue, 0))}
                    </TableCell>
                    <TableCell className="font-bold text-foreground">
                      {formatCurrency(teams.reduce((s, r) => s + r.daily.spend, 0))}
                    </TableCell>
                    <TableCell>
                      <ProfitCell value={teams.reduce((s, r) => s + r.daily.profit, 0)} />
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const rev = teams.reduce((s, r) => s + r.daily.revenue, 0)
                        const spend = teams.reduce((s, r) => s + r.daily.spend, 0)
                        const roi = spend > 0 ? ((rev - spend) / spend) * 100 : 0
                        return (
                          <span
                            className={`font-bold ${roi >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
                          >
                            {roi.toFixed(2)}%
                          </span>
                        )
                      })()}
                    </TableCell>
                    {/* Yesterday totals */}
                    <TableCell className="font-bold text-foreground border-l border-border/30">
                      {formatCurrency(yesterdayTotals.revenue)}
                    </TableCell>
                    <TableCell className="font-bold text-foreground">
                      {formatCurrency(yesterdayTotals.spend)}
                    </TableCell>
                    <TableCell>
                      <ProfitCell value={yesterdayTotals.profit} />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-bold ${yesterdayTotals.roi >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
                      >
                        {yesterdayTotals.roi.toFixed(2)}%
                      </span>
                    </TableCell>
                    {/* Monthly totals */}
                    <TableCell className="font-bold text-foreground border-l border-border/30">
                      {formatCurrency(teams.reduce((s, r) => s + r.monthly.revenue, 0))}
                    </TableCell>
                    <TableCell className="font-bold text-foreground">
                      {formatCurrency(teams.reduce((s, r) => s + r.monthly.spend, 0))}
                    </TableCell>
                    <TableCell>
                      <ProfitCell value={teams.reduce((s, r) => s + r.monthly.profit, 0)} />
                    </TableCell>
                    <TableCell className="pr-6">
                      {(() => {
                        const rev = teams.reduce((s, r) => s + r.monthly.revenue, 0)
                        const spend = teams.reduce((s, r) => s + r.monthly.spend, 0)
                        const roi = spend > 0 ? ((rev - spend) / spend) * 100 : 0
                        return (
                          <span
                            className={`font-bold ${roi >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
                          >
                            {roi.toFixed(2)}%
                          </span>
                        )
                      })()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              )}
            </Table>
          </div>
        </Card>
      )}

      {/* Top Users Table */}
      {canViewUserTable && (
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden flex flex-col bg-card mt-2">
          {/* Card Header: title + top 3 monthly profit cards */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-border/50 px-2 md:px-6 py-5 bg-muted/20">
            <div className="shrink-0">
              <CardTitle className="text-xl font-bold">Top Users by Profit</CardTitle>
              <CardDescription className="mt-1 text-sm">
                Sorted by daily profit — top 3 monthly profit leaders
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {tableLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-3 py-3 min-w-0 flex-1"
                    >
                      <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))
                : [...(revenueTable?.top_users ?? [])]
                    .sort((a, b) => b.monthly.profit - a.monthly.profit)
                    .slice(0, 3)
                    .map((user, i) => {
                      const medals = ['🥇', '🥈', '🥉']
                      const colors = [
                        {
                          bg: 'bg-yellow-500/10',
                          text: 'text-yellow-600 dark:text-yellow-400',
                          badge: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
                        },
                        {
                          bg: 'bg-slate-400/10',
                          text: 'text-slate-500 dark:text-slate-400',
                          badge: 'bg-slate-400/10 text-slate-500 dark:text-slate-400',
                        },
                        {
                          bg: 'bg-orange-400/10',
                          text: 'text-orange-500 dark:text-orange-400',
                          badge: 'bg-orange-400/10 text-orange-500 dark:text-orange-400',
                        },
                      ]
                      const c = colors[i]
                      return (
                        <div
                          key={user.user_id}
                          className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-3 py-3 min-w-0 flex-1"
                        >
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${c.bg}`}
                          >
                            {medals[i]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${c.text}`}
                              >
                                #{i + 1} Monthly Profit
                              </span>
                            </div>
                            <div className="text-sm font-bold text-foreground truncate">
                              {user.user_name}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground/70">
                                  Monthly
                                </span>
                                <span
                                  className={`text-xs md:text-sm font-semibold ${user.monthly.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                                >
                                  {formatCurrency(user.monthly.profit)}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground/70">ROI</span>
                                <span
                                  className={`text-xs md:text-sm font-semibold ${user.monthly.roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                                >
                                  {user.monthly.roi.toFixed(2)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto row-stripe">
            <Table className="whitespace-nowrap">
              <TableHeader>
                {/* Group header row */}
                <TableRow className="hover:bg-transparent border-b-0 bg-muted/10">
                  <TableHead
                    rowSpan={2}
                    className="py-3 px-3 md:px-6 text-xs md:text-sm font-semibold text-muted-foreground w-12 md:w-16 sticky left-0 z-20 sticky-col border-r border-border/30 align-middle"
                  >
                    Rank
                  </TableHead>
                  <TableHead
                    rowSpan={2}
                    className="py-3 px-2 md:px-4 text-xs md:text-sm font-semibold text-muted-foreground w-[120px] md:w-[160px] sticky left-[53px] md:left-[80px] z-20 sticky-col border-r border-border/30 align-middle"
                  >
                    User
                  </TableHead>
                  <TableHead
                    colSpan={4}
                    className="text-center font-semibold text-foreground border-l border-b border-border/30 py-2.5"
                  >
                    <span className="inline-flex items-center gap-2">
                      Daily
                      <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-500">
                        Today
                      </span>
                    </span>
                  </TableHead>
                  <TableHead
                    colSpan={4}
                    className="text-center font-semibold text-foreground border-l border-b border-border/30 py-2.5"
                  >
                    <span className="inline-flex items-center gap-2">
                      Yesterday
                      <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-500">
                        Yesterday
                      </span>
                    </span>
                  </TableHead>
                  <TableHead
                    colSpan={4}
                    className="text-center font-semibold text-foreground border-l border-b border-border/30 py-2.5 pr-6"
                  >
                    <span className="inline-flex items-center gap-2">
                      Monthly
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                        Current month
                      </span>
                    </span>
                  </TableHead>
                </TableRow>
                {/* Sub-header row */}
                <TableRow className="hover:bg-transparent border-b border-border/50 bg-muted/10">
                  {(['Daily', 'Yesterday', 'Monthly'] as const).flatMap((period) =>
                    ['Revenue', 'Spend', 'Profit', 'ROI %'].map((label, li) => (
                      <TableHead
                        key={`${period}-${label}`}
                        className={`py-2.5 text-xs font-semibold text-muted-foreground w-32 ${li === 0 ? 'border-l border-border/30' : ''} ${period === 'Monthly' && li === 3 ? 'pr-6' : ''}`}
                      >
                        {label}
                      </TableHead>
                    )),
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {tableLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="px-3 md:px-6 py-4 sticky left-0 z-10 sticky-col border-r border-border/30">
                          <Skeleton className="h-4 w-6" />
                        </TableCell>
                        <TableCell className="px-2 md:px-4 sticky left-[53px] md:left-[80px] z-10 sticky-col border-r border-border/30">
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        {Array.from({ length: 12 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : [...(revenueTable?.top_users ?? [])]
                      .sort((a, b) => b.daily.profit - a.daily.profit)
                      .map((row, idx) => {
                        const isTopThree = idx < 3
                        return (
                          <TableRow
                            key={row.user_id}
                            className={`border-b border-border/30 transition-colors ${isTopThree ? 'bg-blue-300/5 hover:bg-blue-300/10' : ''}`}
                          >
                            <TableCell className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm font-bold sticky left-0 z-10 sticky-col border-r border-border/30">
                              {isTopThree ? (
                                <span className="text-rose-500 dark:text-rose-400">
                                  {['🥇', '🥈', '🥉'][idx]} {idx + 1}
                                </span>
                              ) : (
                                <span className="text-muted-foreground font-medium">{idx + 1}</span>
                              )}
                            </TableCell>
                            <TableCell className="px-2 md:px-4 text-xs md:text-sm font-semibold text-foreground sticky left-[53px] md:left-[80px] z-10 sticky-col border-r border-border/30">
                              {row.user_name}
                            </TableCell>
                            {/* Daily */}
                            <TableCell className="text-xs md:text-sm px-2 md:px-6 text-foreground font-medium border-l border-border/30">
                              {formatCurrency(row.daily.revenue)}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm text-foreground font-medium">
                              {formatCurrency(row.daily.spend)}
                            </TableCell>
                            <TableCell>
                              <ProfitCell value={row.daily.profit} />
                            </TableCell>
                            <TableCell>
                              <span
                                className={`text-xs md:text-sm font-semibold ${row.daily.roi >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
                              >
                                {row.daily.roi.toFixed(2)}%
                              </span>
                            </TableCell>
                            {/* Yesterday */}
                            <TableCell className="text-xs md:text-sm px-2 md:px-6 text-foreground font-medium border-l border-border/30">
                              {formatCurrency(row.yesterday.revenue)}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm text-foreground font-medium">
                              {formatCurrency(row.yesterday.spend)}
                            </TableCell>
                            <TableCell>
                              <ProfitCell value={row.yesterday.profit} />
                            </TableCell>
                            <TableCell>
                              <span
                                className={`text-xs md:text-sm font-semibold ${row.yesterday.roi >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
                              >
                                {row.yesterday.roi.toFixed(2)}%
                              </span>
                            </TableCell>
                            {/* Monthly */}
                            <TableCell className="text-xs md:text-sm px-2 md:px-6 text-foreground font-medium border-l border-border/30">
                              {formatCurrency(row.monthly.revenue)}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm text-foreground font-medium">
                              {formatCurrency(row.monthly.spend)}
                            </TableCell>
                            <TableCell>
                              <ProfitCell value={row.monthly.profit} />
                            </TableCell>
                            <TableCell className="pr-6">
                              <span
                                className={`text-xs md:text-sm font-semibold ${row.monthly.roi >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
                              >
                                {row.monthly.roi.toFixed(2)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        )
                      })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {!canViewStats && !canViewTeamTable && !canViewUserTable && !canViewMainTeamTable && (
        <Card className="rounded-2xl border-border/50 shadow-sm bg-card">
          <CardHeader>
            <CardTitle className="text-lg">No dashboard data permission</CardTitle>
            <CardDescription>
              Please contact your administrator to grant dashboard view permissions.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}

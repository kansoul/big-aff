import dayjs from 'dayjs'
import { Activity, ArrowUpRight, Calendar, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
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
import type { InsightStatsData, RevenueTableData } from '@/features/dashboard/types'
import { useAuthStore } from '@/hooks/useAuthStore'

// ── helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(val)

// ── sub-components ────────────────────────────────────────────────────────────

interface StatsCardProps {
  title: string
  primaryLabel: string
  primaryValue: string
  secondaryLabel: string
  secondaryValue: string
  color: 'emerald' | 'blue'
  chartData: { value: number }[]
  loading: boolean
  index: number
}

function StatsCard({
  title,
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
  color,
  chartData,
  loading,
  index,
}: StatsCardProps) {
  const isGreen = color === 'emerald'
  const gradientStart = isGreen ? '#10b981' : '#3b82f6'
  const badgeClass = isGreen
    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
    : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'

  return (
    <Card className="rounded-2xl border border-border/60 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all group bg-card relative">
      <div
        className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-3xl opacity-20 transition-opacity group-hover:opacity-40 ${isGreen ? 'bg-emerald-500' : 'bg-blue-500'}`}
      />

      <div className="p-5 pb-0 flex-1 relative z-10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-muted-foreground text-sm tracking-wide uppercase">
            {title}
          </h3>
          <div
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass} uppercase tracking-wider flex items-center gap-1`}
          >
            <Activity className="w-3 h-3" />
            Live
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground font-medium mb-1">{primaryLabel}</span>
            {loading ? (
              <Skeleton className="h-9 w-28 mt-1" />
            ) : (
              <span className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                {primaryValue}
              </span>
            )}
          </div>
          <div className="flex flex-col border-l border-border/50 pl-4 justify-end">
            <span className="text-xs text-muted-foreground font-medium mb-1">{secondaryLabel}</span>
            {loading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <span className="text-lg font-semibold text-muted-foreground">{secondaryValue}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 relative z-10">
        <div className="px-5 mb-2 flex items-center gap-1.5 text-xs font-semibold">
          <span
            className={
              isGreen
                ? 'text-emerald-500 dark:text-emerald-400'
                : 'text-blue-500 dark:text-blue-400'
            }
          >
            {title} Trend
          </span>
        </div>
        <div className="h-12 w-full">
          {loading ? (
            <Skeleton className="h-12 w-full rounded-none" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 0, left: 0, right: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={gradientStart} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={gradientStart} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={gradientStart}
                  strokeWidth={2}
                  fill={`url(#grad-${index})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Card>
  )
}

const ProfitCell = ({ value }: { value: number }) => (
  <span
    className={`font-semibold ${value > 0 ? 'text-emerald-500 dark:text-emerald-400' : value < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-muted-foreground'}`}
  >
    {formatCurrency(value)}
  </span>
)

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
  const permissions = useAuthStore((s) => s.user?.permissions ?? [])
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

  const canLoadRevenueTable = canViewTeamTable || canViewUserTable

  const [statsLoading, setStatsLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(true)
  const [statsCards, setStatsCards] = useState<StatsCardData[]>(INITIAL_STATS)
  const [revenueTable, setRevenueTable] = useState<RevenueTableData | null>(null)

  // ── load 6 stats cards ───────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    if (!canViewStats) {
      setStatsCards(INITIAL_STATS)
      setStatsLoading(false)
      return
    }

    try {
      setStatsLoading(true)
      const res = await dashboardApi.insightStats()
      setStatsCards(buildStatsCards(res.data.data))
    } catch {
      toast.error('Failed to load dashboard stats.')
    } finally {
      setStatsLoading(false)
    }
  }, [canViewStats])

  // ── load revenue table (teams/users permission) ──────────────────────────
  const loadRevenueTable = useCallback(async () => {
    if (!canLoadRevenueTable) {
      setRevenueTable(null)
      setTableLoading(false)
      return
    }
    try {
      setTableLoading(true)
      const res = await dashboardApi.revenueTable({ top_limit: 10 })
      setRevenueTable(res.data.data)
    } catch {
      toast.error('Failed to load team revenue data.')
    } finally {
      setTableLoading(false)
    }
  }, [canLoadRevenueTable])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  useEffect(() => {
    void loadRevenueTable()
  }, [loadRevenueTable])

  // ── derived insight cards ────────────────────────────────────────────────
  const teams = useMemo(() => revenueTable?.by_team ?? [], [revenueTable])

  return (
    <div className="flex flex-col gap-6 pb-8 animate-in fade-in duration-500">
      {/* Hero Banner */}
      <div className="relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-8 p-8 sm:p-10 rounded-3xl border border-border/50 shadow-sm bg-zinc-950 text-white">
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

      {/* 6 Stats Cards */}
      {canViewStats && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {statsCards.map((card, idx) => (
            <StatsCard key={idx} {...card} loading={statsLoading} index={idx} />
          ))}
        </div>
      )}

      {/* Team Breakdown Table */}
      {canViewTeamTable && (
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden flex flex-col bg-card mt-2">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/50 pb-5 pt-6 bg-muted/20">
            <div>
              <CardTitle className="text-lg font-bold">Team Breakdown</CardTitle>
              <CardDescription className="mt-1 text-sm">
                Revenue, spend, profit and ROI by team — current month.
              </CardDescription>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <Table className="whitespace-nowrap">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b-border/50 bg-muted/10">
                  <TableHead className="py-4 px-6 font-semibold text-muted-foreground w-[200px] sticky left-0 z-20 bg-muted/10 backdrop-blur-sm border-r border-border/30">
                    Team
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground w-40">
                    Revenue
                    <br />
                    <span className="text-[10px] font-normal text-muted-foreground/60">
                      (Daily / Monthly)
                    </span>
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground w-40">
                    Spend
                    <br />
                    <span className="text-[10px] font-normal text-muted-foreground/60">
                      (Daily / Monthly)
                    </span>
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground w-40">
                    Profit
                    <br />
                    <span className="text-[10px] font-normal text-muted-foreground/60">
                      (Daily / Monthly)
                    </span>
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground pr-6 w-32">
                    ROI %<br />
                    <span className="text-[10px] font-normal text-muted-foreground/60">
                      (Daily / Monthly)
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {tableLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="px-6 py-4 sticky left-0 bg-card/80 border-r border-border/30">
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell className="pr-6">
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      </TableRow>
                    ))
                  : teams.map((row) => (
                      <TableRow
                        key={row.team_id}
                        className="border-b-border/30 transition-colors hover:bg-muted/30"
                      >
                        <TableCell className="px-6 py-4 font-semibold text-foreground sticky left-0 z-10 bg-card/80 backdrop-blur-sm border-r border-border/30">
                          {row.team_name}
                        </TableCell>
                        <TableCell className="font-medium text-muted-foreground">
                          <div className="flex flex-col gap-1">
                            <span className="text-foreground">
                              {formatCurrency(row.daily.revenue)}
                            </span>
                            <span className="text-xs text-muted-foreground/70">
                              {formatCurrency(row.monthly.revenue)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-muted-foreground">
                          <div className="flex flex-col gap-1">
                            <span className="text-foreground">
                              {formatCurrency(row.daily.spend)}
                            </span>
                            <span className="text-xs text-muted-foreground/70">
                              {formatCurrency(row.monthly.spend)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <ProfitCell value={row.daily.profit} />
                            <span className="text-xs text-muted-foreground/70">
                              {formatCurrency(row.monthly.profit)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`font-semibold ${row.daily.roi >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
                            >
                              {row.daily.roi.toFixed(2)}%
                            </span>
                            <span className="text-xs text-muted-foreground/70">
                              {row.monthly.roi.toFixed(2)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>

              {!tableLoading && teams.length > 0 && (
                <TableBody>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 font-bold border-t-2 border-border">
                    <TableCell className="px-6 py-5 sticky left-0 z-10 bg-muted/90 backdrop-blur-sm border-r border-border/30">
                      Summary (Month)
                    </TableCell>
                    <TableCell className="text-foreground">
                      {formatCurrency(teams.reduce((s, r) => s + r.monthly.revenue, 0))}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {formatCurrency(teams.reduce((s, r) => s + r.monthly.spend, 0))}
                    </TableCell>
                    <TableCell>
                      <ProfitCell value={teams.reduce((s, r) => s + r.monthly.profit, 0)} />
                    </TableCell>
                    <TableCell className="pr-6 text-foreground">—</TableCell>
                  </TableRow>
                </TableBody>
              )}
            </Table>
          </div>
        </Card>
      )}

      {/* Top Users Table */}
      {canViewUserTable && (
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden flex flex-col bg-card">
          <CardHeader className="border-b border-border/50 pb-5 pt-6 bg-muted/20">
            <CardTitle className="text-lg font-bold">Top Users by Revenue</CardTitle>
            <CardDescription className="mt-1 text-sm">
              Highest revenue contributors this month.
            </CardDescription>
          </CardHeader>

          <div className="overflow-x-auto">
            <Table className="whitespace-nowrap">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b-border/50 bg-muted/10">
                  <TableHead className="py-4 px-6 font-semibold text-muted-foreground">#</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">User</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Team</TableHead>
                  <TableHead className="font-semibold text-muted-foreground w-40">
                    Revenue
                    <br />
                    <span className="text-[10px] font-normal text-muted-foreground/60">
                      (Daily / Monthly)
                    </span>
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground w-40">
                    Spend
                    <br />
                    <span className="text-[10px] font-normal text-muted-foreground/60">
                      (Daily / Monthly)
                    </span>
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground w-40">
                    Profit
                    <br />
                    <span className="text-[10px] font-normal text-muted-foreground/60">
                      (Daily / Monthly)
                    </span>
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground pr-6 w-32">
                    ROI %<br />
                    <span className="text-[10px] font-normal text-muted-foreground/60">
                      (Daily / Monthly)
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {tableLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="px-6 py-4">
                          <Skeleton className="h-4 w-6" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-24" />
                        </TableCell>
                        <TableCell className="pr-6">
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                      </TableRow>
                    ))
                  : (revenueTable?.top_users ?? []).map((row, idx) => (
                      <TableRow
                        key={row.user_id}
                        className="border-b-border/30 transition-colors hover:bg-muted/30"
                      >
                        <TableCell className="px-6 py-4 text-muted-foreground font-medium">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {row.user_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.team_name}</TableCell>
                        <TableCell className="font-medium text-muted-foreground">
                          <div className="flex flex-col gap-1">
                            <span className="text-foreground">
                              {formatCurrency(row.daily.revenue)}
                            </span>
                            <span className="text-xs text-muted-foreground/70">
                              {formatCurrency(row.monthly.revenue)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-muted-foreground">
                          <div className="flex flex-col gap-1">
                            <span className="text-foreground">
                              {formatCurrency(row.daily.spend)}
                            </span>
                            <span className="text-xs text-muted-foreground/70">
                              {formatCurrency(row.monthly.spend)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <ProfitCell value={row.daily.profit} />
                            <span className="text-xs text-muted-foreground/70">
                              {formatCurrency(row.monthly.profit)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`font-semibold ${row.daily.roi >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
                            >
                              {row.daily.roi.toFixed(2)}%
                            </span>
                            <span className="text-xs text-muted-foreground/70">
                              {row.monthly.roi.toFixed(2)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {!canViewStats && !canViewTeamTable && !canViewUserTable && (
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

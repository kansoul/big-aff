import dayjs from '@/lib/dayjs'
import { Activity, ArrowUpRight, Calendar, Sparkles } from 'lucide-react'
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
  const [rawStats, setRawStats] = useState<InsightStatsData | null>(null)
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
      setRawStats(res.data.data)
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

      {/* Stats Table */}
      {canViewStats && (
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <Table className="whitespace-nowrap">
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b-0 bg-muted/10">
                  <TableHead
                    rowSpan={2}
                    className="py-3 px-6 font-semibold text-muted-foreground w-[140px] sticky left-0 z-20 bg-muted/10 border-r border-border/30 align-middle"
                  />
                  <TableHead
                    colSpan={2}
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
                    colSpan={2}
                    className="text-center font-semibold text-foreground border-l border-b border-border/30 py-2.5"
                  >
                    <span className="inline-flex items-center gap-2">
                      Weekly
                      <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-500">
                        This week
                      </span>
                    </span>
                  </TableHead>
                  <TableHead
                    colSpan={2}
                    className="text-center font-semibold text-foreground border-l border-b border-border/30 py-2.5 pr-6"
                  >
                    <span className="inline-flex items-center gap-2">
                      Monthly
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                        This month
                      </span>
                    </span>
                  </TableHead>
                </TableRow>
                <TableRow className="hover:bg-transparent border-b border-border/50 bg-muted/10">
                  {[
                    { label: 'Today', sub: 'Yesterday', border: true },
                    { label: 'Yesterday', sub: 'vs prev' },
                    { label: 'This Week', sub: 'Last Week', border: true },
                    { label: 'Last Week', sub: 'vs prev' },
                    { label: 'This Month', sub: 'Last Month', border: true },
                    { label: 'Last Month', sub: 'vs prev' },
                  ].map(({ label, border }, i) => (
                    <TableHead
                      key={i}
                      className={`py-2.5 text-xs font-semibold text-muted-foreground w-36 ${border ? 'border-l border-border/30' : ''} ${i === 5 ? 'pr-6' : ''}`}
                    >
                      {label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* Revenue row */}
                <TableRow className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <TableCell className="px-6 py-5 sticky left-0 z-10 bg-card/80 backdrop-blur-sm border-r border-border/30">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="font-bold text-sm text-foreground">Revenue</span>
                    </div>
                  </TableCell>
                  {statsLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableCell key={i} className={i % 2 === 0 ? 'border-l border-border/30' : ''}>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                    ))
                  ) : (
                    <>
                      <TableCell className="border-l border-border/30">
                        <span className="text-base font-bold text-foreground">
                          {statsCards[0]?.primaryValue}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-medium">
                        {statsCards[0]?.secondaryValue}
                      </TableCell>
                      <TableCell className="border-l border-border/30">
                        <span className="text-base font-bold text-foreground">
                          {statsCards[1]?.primaryValue}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-medium">
                        {statsCards[1]?.secondaryValue}
                      </TableCell>
                      <TableCell className="border-l border-border/30">
                        <span className="text-base font-bold text-foreground">
                          {statsCards[2]?.primaryValue}
                        </span>
                      </TableCell>
                      <TableCell className="pr-6 text-muted-foreground font-medium">
                        {statsCards[2]?.secondaryValue}
                      </TableCell>
                    </>
                  )}
                </TableRow>

                {/* Spend row */}
                <TableRow className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <TableCell className="px-6 py-5 sticky left-0 z-10 bg-card/80 backdrop-blur-sm border-r border-border/30">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="font-bold text-sm text-foreground">Spend</span>
                    </div>
                  </TableCell>
                  {statsLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableCell key={i} className={i % 2 === 0 ? 'border-l border-border/30' : ''}>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                    ))
                  ) : (
                    <>
                      <TableCell className="border-l border-border/30">
                        <span className="text-base font-bold text-foreground">
                          {statsCards[3]?.primaryValue}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-medium">
                        {statsCards[3]?.secondaryValue}
                      </TableCell>
                      <TableCell className="border-l border-border/30">
                        <span className="text-base font-bold text-foreground">
                          {statsCards[4]?.primaryValue}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-medium">
                        {statsCards[4]?.secondaryValue}
                      </TableCell>
                      <TableCell className="border-l border-border/30">
                        <span className="text-base font-bold text-foreground">
                          {statsCards[5]?.primaryValue}
                        </span>
                      </TableCell>
                      <TableCell className="pr-6 text-muted-foreground font-medium">
                        {statsCards[5]?.secondaryValue}
                      </TableCell>
                    </>
                  )}
                </TableRow>

                {/* Profit row */}
                <TableRow className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <TableCell className="px-6 py-5 sticky left-0 z-10 bg-card/80 backdrop-blur-sm border-r border-border/30">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-violet-500" />
                      <span className="font-bold text-sm text-foreground">Profit</span>
                    </div>
                  </TableCell>
                  {statsLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableCell key={i} className={i % 2 === 0 ? 'border-l border-border/30' : ''}>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                    ))
                  ) : (
                    <>
                      {[
                        [rawStats?.daily_revenue.today, rawStats?.daily_spend.today],
                        [rawStats?.daily_revenue.yesterday, rawStats?.daily_spend.yesterday],
                        [rawStats?.weekly_revenue.this_week, rawStats?.weekly_spend.this_week],
                        [rawStats?.weekly_revenue.last_week, rawStats?.weekly_spend.last_week],
                        [rawStats?.monthly_revenue.this_month, rawStats?.monthly_spend.this_month],
                        [rawStats?.monthly_revenue.last_month, rawStats?.monthly_spend.last_month],
                      ].map(([rev, spend], i) => {
                        const profit = (rev ?? 0) - (spend ?? 0)
                        return (
                          <TableCell
                            key={i}
                            className={`${i % 2 === 0 ? 'border-l border-border/30' : ''} ${i === 5 ? 'pr-6' : ''}`}
                          >
                            <ProfitCell value={profit} />
                          </TableCell>
                        )
                      })}
                    </>
                  )}
                </TableRow>

                {/* ROI row */}
                <TableRow className="hover:bg-muted/30 transition-colors">
                  <TableCell className="px-6 py-5 sticky left-0 z-10 bg-card/80 backdrop-blur-sm border-r border-border/30">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="font-bold text-sm text-foreground">ROI %</span>
                    </div>
                  </TableCell>
                  {statsLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableCell key={i} className={i % 2 === 0 ? 'border-l border-border/30' : ''}>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                    ))
                  ) : (
                    <>
                      {[
                        [rawStats?.daily_revenue.today, rawStats?.daily_spend.today],
                        [rawStats?.daily_revenue.yesterday, rawStats?.daily_spend.yesterday],
                        [rawStats?.weekly_revenue.this_week, rawStats?.weekly_spend.this_week],
                        [rawStats?.weekly_revenue.last_week, rawStats?.weekly_spend.last_week],
                        [rawStats?.monthly_revenue.this_month, rawStats?.monthly_spend.this_month],
                        [rawStats?.monthly_revenue.last_month, rawStats?.monthly_spend.last_month],
                      ].map(([rev, spend], i) => {
                        const r = rev ?? 0
                        const s = spend ?? 0
                        const roi = s > 0 ? ((r - s) / s) * 100 : 0
                        return (
                          <TableCell
                            key={i}
                            className={`${i % 2 === 0 ? 'border-l border-border/30' : ''} ${i === 5 ? 'pr-6' : ''}`}
                          >
                            <span
                              className={`font-semibold ${roi > 0 ? 'text-emerald-500 dark:text-emerald-400' : roi < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-muted-foreground'}`}
                            >
                              {roi.toFixed(2)}%
                            </span>
                          </TableCell>
                        )
                      })}
                    </>
                  )}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Team Breakdown Table */}
      {canViewTeamTable && (
        <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden flex flex-col bg-card mt-2">
          {/* Card Header: title + summary stat cards */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-border/50 px-6 py-5 bg-muted/20">
            <div className="shrink-0">
              <CardTitle className="text-xl font-bold">Team Breakdown</CardTitle>
              <CardDescription className="mt-1 text-sm">
                Revenue, spend, profit and ROI by team
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* TODAY SUMMARY */}
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 min-w-0 flex-1">
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
                  <div className="flex items-center gap-4 flex-wrap">
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
                          <span className="text-sm font-semibold text-foreground">
                            {formatCurrency(teams.reduce((s, r) => s + r.daily.revenue, 0))}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/70">Spend</span>
                          <span className="text-sm font-semibold text-foreground">
                            {formatCurrency(teams.reduce((s, r) => s + r.daily.spend, 0))}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/70">Profit</span>
                          <span
                            className={`text-sm font-semibold ${teams.reduce((s, r) => s + r.daily.profit, 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
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
                                className={`text-sm font-semibold ${roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
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
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-4 py-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Month Summary
                    </span>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                      Current month
                    </span>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
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
                          <span className="text-sm font-semibold text-foreground">
                            {formatCurrency(teams.reduce((s, r) => s + r.monthly.revenue, 0))}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/70">Spend</span>
                          <span className="text-sm font-semibold text-foreground">
                            {formatCurrency(teams.reduce((s, r) => s + r.monthly.spend, 0))}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground/70">Profit</span>
                          <span
                            className={`text-sm font-semibold ${teams.reduce((s, r) => s + r.monthly.profit, 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
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
                                className={`text-sm font-semibold ${roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
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
          <div className="overflow-x-auto">
            <Table className="whitespace-nowrap">
              <TableHeader>
                {/* Group header row */}
                <TableRow className="hover:bg-transparent border-b-0 bg-muted/10">
                  <TableHead
                    rowSpan={2}
                    className="py-3 px-6 font-semibold text-muted-foreground w-[180px] sticky left-0 z-20 bg-muted/10 border-r border-border/30 align-middle"
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
                  {['Daily', 'Monthly'].flatMap((period) =>
                    ['Revenue', 'Spend', 'Profit', 'ROI %'].map((label, li) => (
                      <TableHead
                        key={`${period}-${label}`}
                        className={`py-2.5 text-xs font-semibold text-muted-foreground w-32 ${li === 0 ? 'border-l border-border/30' : ''} ${period === 'Monthly' && li === 3 ? 'pr-6' : ''}`}
                      >
                        {label}
                        <div className="text-[10px] font-normal text-muted-foreground/60">
                          ({period})
                        </div>
                      </TableHead>
                    )),
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {tableLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="px-6 py-4 sticky left-0 bg-card/80 border-r border-border/30">
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                        {Array.from({ length: 8 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-20" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : teams.map((row) => (
                      <TableRow
                        key={row.team_id}
                        className="border-b border-border/30 transition-colors hover:bg-muted/30"
                      >
                        <TableCell className="px-6 py-4 font-semibold text-foreground sticky left-0 z-10 bg-card/80 backdrop-blur-sm border-r border-border/30">
                          {row.team_name}
                        </TableCell>
                        {/* Daily */}
                        <TableCell className="text-foreground font-medium border-l border-border/30">
                          {formatCurrency(row.daily.revenue)}
                        </TableCell>
                        <TableCell className="text-foreground font-medium">
                          {formatCurrency(row.daily.spend)}
                        </TableCell>
                        <TableCell>
                          <ProfitCell value={row.daily.profit} />
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-semibold ${row.daily.roi >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
                          >
                            {row.daily.roi.toFixed(2)}%
                          </span>
                        </TableCell>
                        {/* Monthly */}
                        <TableCell className="text-foreground font-medium border-l border-border/30">
                          {formatCurrency(row.monthly.revenue)}
                        </TableCell>
                        <TableCell className="text-foreground font-medium">
                          {formatCurrency(row.monthly.spend)}
                        </TableCell>
                        <TableCell>
                          <ProfitCell value={row.monthly.profit} />
                        </TableCell>
                        <TableCell className="pr-6">
                          <span
                            className={`font-semibold ${row.monthly.roi >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
                          >
                            {row.monthly.roi.toFixed(2)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>

              {!tableLoading && teams.length > 0 && (
                <TableBody>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-t-2 border-border">
                    <TableCell className="px-6 py-4 sticky left-0 z-10 bg-muted/90 backdrop-blur-sm border-r border-border/30">
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

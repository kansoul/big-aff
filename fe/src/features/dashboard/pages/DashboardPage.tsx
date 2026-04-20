import {
  Calendar,
  Activity,
  Filter,
  Search,
  Download,
  Sparkles,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

// --- MOCK DATA ---

const generateSparkline = (base: number, variance: number, points: number = 20) =>
  Array.from({ length: points }, (_, i) => ({
    value: base + Math.sin(i) * variance + Math.random() * variance,
  }))

const statsCards = [
  {
    title: 'Daily Revenue',
    primaryLabel: 'Today',
    primaryValue: '$267.26',
    secondaryLabel: 'Yesterday',
    secondaryValue: '$26,281.65',
    trend: 'down',
    color: 'emerald',
    chartData: generateSparkline(100, 20),
  },
  {
    title: 'Weekly Revenue',
    primaryLabel: 'This Week',
    primaryValue: '$267.26',
    secondaryLabel: 'Last Week',
    secondaryValue: '$150,730.50',
    trend: 'down',
    color: 'emerald',
    chartData: generateSparkline(1000, 300),
  },
  {
    title: 'Monthly Revenue',
    primaryLabel: 'This Month',
    primaryValue: '$577,076.70',
    secondaryLabel: 'Last Month',
    secondaryValue: '$1,334,433.39',
    trend: 'down',
    color: 'emerald',
    chartData: generateSparkline(10000, 2000),
  },
  {
    title: 'Daily Spend',
    primaryLabel: 'Today',
    primaryValue: '$283.20',
    secondaryLabel: 'Yesterday',
    secondaryValue: '$22,221.14',
    trend: 'down',
    color: 'blue',
    chartData: generateSparkline(80, 15),
  },
  {
    title: 'Weekly Spend',
    primaryLabel: 'This Week',
    primaryValue: '$283.20',
    secondaryLabel: 'Last Week',
    secondaryValue: '$137,128.33',
    trend: 'down',
    color: 'blue',
    chartData: generateSparkline(800, 200),
  },
  {
    title: 'Monthly Spend',
    primaryLabel: 'This Month',
    primaryValue: '$494,877.50',
    secondaryLabel: 'Last Month',
    secondaryValue: '$1,061,562.75',
    trend: 'down',
    color: 'blue',
    chartData: generateSparkline(8000, 1500),
  },
]

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(val)

const teamData = [
  {
    team: 'Team Nexa',
    today: { rev: 123.36, spend: 117.52, profit: 5.84 },
    yesterday: { rev: 11751.53, spend: 9454.2, profit: 2297.33 },
    monthly: { rev: 238032.84, spend: 207174.48, profit: 30858.36 },
    lastMonth: { rev: 400078.22, spend: 337471.99, profit: 62606.23 },
  },
  {
    team: 'Team ĐN',
    today: { rev: 56.28, spend: 74.1, profit: -17.82 },
    yesterday: { rev: 9020.92, spend: 7836.49, profit: 1184.43 },
    monthly: { rev: 226384.27, spend: 180964.82, profit: 45419.45 },
    lastMonth: { rev: 444388.65, spend: 329021.28, profit: 115367.37 },
  },
  {
    team: 'Team HN',
    today: { rev: 53.36, spend: 63.24, profit: -9.88 },
    yesterday: { rev: 5157.4, spend: 4545.24, profit: 612.16 },
    monthly: { rev: 92589.22, spend: 87301.25, profit: 5287.97 },
    lastMonth: { rev: 420748.33, spend: 335344.68, profit: 85403.65 },
  },
  {
    team: 'Team HN2',
    today: { rev: 34.26, spend: 23.57, profit: 10.69 },
    yesterday: { rev: 351.8, spend: 350.2, profit: 1.6 },
    monthly: { rev: 20070.37, spend: 18888.33, profit: 1182.04 },
    lastMonth: { rev: 69218.19, spend: 59724.79, profit: 9493.4 },
  },
  {
    team: 'Team Tài Nguyên',
    today: { rev: 0.0, spend: 4.75, profit: -4.75 },
    yesterday: { rev: 0.0, spend: 35.0, profit: -35.0 },
    monthly: { rev: 0.0, spend: 548.6, profit: -548.6 },
    lastMonth: { rev: 0.0, spend: 0.0, profit: 0.0 },
  },
]

// Calculate summaries dynamically
const summary = teamData.reduce(
  (acc, curr) => {
    return {
      today: {
        rev: acc.today.rev + curr.today.rev,
        spend: acc.today.spend + curr.today.spend,
        profit: acc.today.profit + curr.today.profit,
      },
      yesterday: {
        rev: acc.yesterday.rev + curr.yesterday.rev,
        spend: acc.yesterday.spend + curr.yesterday.spend,
        profit: acc.yesterday.profit + curr.yesterday.profit,
      },
      monthly: {
        rev: acc.monthly.rev + curr.monthly.rev,
        spend: acc.monthly.spend + curr.monthly.spend,
        profit: acc.monthly.profit + curr.monthly.profit,
      },
      lastMonth: {
        rev: acc.lastMonth.rev + curr.lastMonth.rev,
        spend: acc.lastMonth.spend + curr.lastMonth.spend,
        profit: acc.lastMonth.profit + curr.lastMonth.profit,
      },
    }
  },
  {
    today: { rev: 0, spend: 0, profit: 0 },
    yesterday: { rev: 0, spend: 0, profit: 0 },
    monthly: { rev: 0, spend: 0, profit: 0 },
    lastMonth: { rev: 0, spend: 0, profit: 0 },
  },
)

const ProfitCell = ({ value }: { value: number }) => {
  const isPositive = value > 0
  const isNegative = value < 0
  return (
    <span
      className={`font-semibold ${isPositive ? 'text-emerald-500 dark:text-emerald-400' : isNegative ? 'text-rose-500 dark:text-rose-400' : 'text-muted-foreground'}`}
    >
      {formatCurrency(value)}
    </span>
  )
}

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 pb-8 animate-in fade-in duration-500">
      {/* Premium Hero Banner */}
      <div className="relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-8 p-8 sm:p-10 rounded-3xl border border-border/50 shadow-sm bg-zinc-950 text-white">
        {/* Decorative Gradients */}
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
            Your campaigns are running smoothly today. Monthly revenue is trending upwards by{' '}
            <span className="text-emerald-400 font-bold inline-flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" /> 14.5%
            </span>{' '}
            compared to the previous period.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row md:flex-col lg:flex-row items-center gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            className="w-full md:w-auto gap-2 rounded-xl h-12 px-6 border-white/20 hover:bg-white/10 bg-white/5 text-white backdrop-blur-md transition-all shadow-sm"
          >
            <Calendar className="h-4 w-4" />
            <span className="font-semibold">Today</span>
          </Button>
          <Button className="w-full md:w-auto gap-2 rounded-xl h-12 px-6 bg-white text-black hover:bg-zinc-200 font-bold shadow-lg transition-all hover:scale-[1.02]">
            <Download className="h-4 w-4" />
            <span>Generate Report</span>
          </Button>
        </div>
      </div>

      {/* AI / Quick Insights Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div className="p-5 rounded-2xl bg-emerald-50 text-emerald-950 border border-emerald-200/60 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-100 flex items-start gap-4 hover:shadow-md transition-shadow group">
          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 mb-1">
              Top Performer
            </h4>
            <p className="text-sm font-medium text-emerald-600/90 dark:text-emerald-300/80 leading-snug">
              Team Nexa generated 45% of total revenue this month.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-rose-50 text-rose-950 border border-rose-200/60 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-100 flex items-start gap-4 hover:shadow-md transition-shadow group">
          <div className="p-3 bg-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 transition-transform group-hover:scale-110">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-800 dark:text-rose-400 mb-1">
              Action Needed
            </h4>
            <p className="text-sm font-medium text-rose-600/90 dark:text-rose-300/80 leading-snug">
              Team Tài Nguyên is currently operating at a deficit.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-indigo-50 text-indigo-950 border border-indigo-200/60 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-100 flex items-start gap-4 hover:shadow-md transition-shadow group">
          <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400 transition-transform group-hover:scale-110">
            <Activity className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-indigo-800 dark:text-indigo-400 mb-1">
              Health Metric
            </h4>
            <p className="text-sm font-medium text-indigo-600/90 dark:text-indigo-300/80 leading-snug">
              Spend efficiency improved by 12% globally this week.
            </p>
          </div>
        </div>
      </div>

      {/* 6 Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statsCards.map((card, idx) => {
          const isGreen = card.color === 'emerald'
          const gradientStart = isGreen ? '#10b981' : '#3b82f6'
          const badgeClass = isGreen
            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
            : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'

          return (
            <Card
              key={idx}
              className="rounded-2xl border border-border/60 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-all group bg-card relative"
            >
              {/* Subtle background glow */}
              <div
                className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 blur-3xl opacity-20 transition-opacity group-hover:opacity-40 ${isGreen ? 'bg-emerald-500' : 'bg-blue-500'}`}
              />

              <div className="p-5 pb-0 flex-1 relative z-10">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-muted-foreground text-sm tracking-wide uppercase">
                    {card.title}
                  </h3>
                  <div
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass} uppercase tracking-wider flex items-center gap-1`}
                  >
                    <Activity className="w-3 h-3" />
                    Live
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Primary Info */}
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground font-medium mb-1">
                      {card.primaryLabel}
                    </span>
                    <span className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                      {card.primaryValue}
                    </span>
                  </div>

                  {/* Secondary Info */}
                  <div className="flex flex-col border-l border-border/50 pl-4 justify-end">
                    <span className="text-xs text-muted-foreground font-medium mb-1">
                      {card.secondaryLabel}
                    </span>
                    <span className="text-lg font-semibold text-muted-foreground">
                      {card.secondaryValue}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sparkline & Comparison text */}
              <div className="mt-6 relative z-10">
                <div className="px-5 mb-2 flex items-center gap-1.5 text-xs font-semibold">
                  <span
                    className={
                      isGreen
                        ? 'text-emerald-500 dark:text-emerald-400'
                        : 'text-blue-500 dark:text-blue-400'
                    }
                  >
                    {card.title} Comparison
                  </span>
                </div>
                <div className="h-12 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={card.chartData}
                      margin={{ top: 0, left: 0, right: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={gradientStart} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={gradientStart} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={gradientStart}
                        strokeWidth={2}
                        fill={`url(#grad-${idx})`}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Detailed Team Performance Table */}
      <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden flex flex-col bg-card mt-2">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/50 pb-5 pt-6 bg-muted/20">
          <div>
            <CardTitle className="text-lg font-bold">Team Breakdown</CardTitle>
            <CardDescription className="mt-1 text-sm">
              Detailed revenue, spend, and profit metrics by team.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 mt-4 sm:mt-0">
            <Button variant="outline" size="sm" className="rounded-lg h-9 shadow-sm bg-background">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg h-9 shadow-sm bg-background">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-border/50 bg-muted/10">
                <TableHead className="py-4 px-6 font-semibold text-muted-foreground w-[200px] sticky left-0 z-20 bg-muted/10 backdrop-blur-sm border-r border-border/30">
                  Team
                </TableHead>

                {/* Today */}
                <TableHead className="font-semibold text-muted-foreground">Today Revenue</TableHead>
                <TableHead className="font-semibold text-muted-foreground">Today Spend</TableHead>
                <TableHead className="font-semibold text-muted-foreground border-r border-border/30">
                  Today Profit
                </TableHead>

                {/* Yesterday */}
                <TableHead className="font-semibold text-muted-foreground pl-6">
                  Yesterday Revenue
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground">
                  Yesterday Spend
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground border-r border-border/30">
                  Yesterday Profit
                </TableHead>

                {/* Monthly */}
                <TableHead className="font-semibold text-muted-foreground pl-6">
                  Monthly Revenue
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground">Monthly Spend</TableHead>
                <TableHead className="font-semibold text-muted-foreground border-r border-border/30">
                  Monthly Profit
                </TableHead>

                {/* Last Month */}
                <TableHead className="font-semibold text-muted-foreground pl-6">
                  Last Month Rev
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground">
                  Last Month Spend
                </TableHead>
                <TableHead className="font-semibold text-muted-foreground pr-6">
                  Last Month Profit
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {teamData.map((row) => (
                <TableRow
                  key={row.team}
                  className="border-b-border/30 transition-colors hover:bg-muted/30"
                >
                  <TableCell className="px-6 py-4 font-semibold text-foreground sticky left-0 z-10 bg-card/80 backdrop-blur-sm border-r border-border/30">
                    {row.team}
                  </TableCell>

                  {/* Today */}
                  <TableCell className="font-medium text-muted-foreground">
                    {formatCurrency(row.today.rev)}
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground">
                    {formatCurrency(row.today.spend)}
                  </TableCell>
                  <TableCell className="border-r border-border/30 bg-muted/5">
                    <ProfitCell value={row.today.profit} />
                  </TableCell>

                  {/* Yesterday */}
                  <TableCell className="font-medium text-muted-foreground pl-6">
                    {formatCurrency(row.yesterday.rev)}
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground">
                    {formatCurrency(row.yesterday.spend)}
                  </TableCell>
                  <TableCell className="border-r border-border/30 bg-muted/5">
                    <ProfitCell value={row.yesterday.profit} />
                  </TableCell>

                  {/* Monthly */}
                  <TableCell className="font-medium text-muted-foreground pl-6">
                    {formatCurrency(row.monthly.rev)}
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground">
                    {formatCurrency(row.monthly.spend)}
                  </TableCell>
                  <TableCell className="border-r border-border/30 bg-muted/5">
                    <ProfitCell value={row.monthly.profit} />
                  </TableCell>

                  {/* Last Month */}
                  <TableCell className="font-medium text-muted-foreground pl-6">
                    {formatCurrency(row.lastMonth.rev)}
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground">
                    {formatCurrency(row.lastMonth.spend)}
                  </TableCell>
                  <TableCell className="pr-6 bg-muted/5">
                    <ProfitCell value={row.lastMonth.profit} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>

            {/* Summary Footer */}
            <TableBody>
              <TableRow className="bg-muted/40 hover:bg-muted/40 font-bold border-t-2 border-border">
                <TableCell className="px-6 py-5 sticky left-0 z-10 bg-muted/90 backdrop-blur-sm border-r border-border/30">
                  <div className="flex items-center gap-2">Summary</div>
                </TableCell>

                {/* Today Summary */}
                <TableCell className="text-foreground">
                  {formatCurrency(summary.today.rev)}
                </TableCell>
                <TableCell className="text-foreground">
                  {formatCurrency(summary.today.spend)}
                </TableCell>
                <TableCell className="border-r border-border/30">
                  <ProfitCell value={summary.today.profit} />
                </TableCell>

                {/* Yesterday Summary */}
                <TableCell className="text-foreground pl-6">
                  {formatCurrency(summary.yesterday.rev)}
                </TableCell>
                <TableCell className="text-foreground">
                  {formatCurrency(summary.yesterday.spend)}
                </TableCell>
                <TableCell className="border-r border-border/30">
                  <ProfitCell value={summary.yesterday.profit} />
                </TableCell>

                {/* Monthly Summary */}
                <TableCell className="text-foreground pl-6">
                  {formatCurrency(summary.monthly.rev)}
                </TableCell>
                <TableCell className="text-foreground">
                  {formatCurrency(summary.monthly.spend)}
                </TableCell>
                <TableCell className="border-r border-border/30">
                  <ProfitCell value={summary.monthly.profit} />
                </TableCell>

                {/* Last Month Summary */}
                <TableCell className="text-foreground pl-6">
                  {formatCurrency(summary.lastMonth.rev)}
                </TableCell>
                <TableCell className="text-foreground">
                  {formatCurrency(summary.lastMonth.spend)}
                </TableCell>
                <TableCell className="pr-6">
                  <ProfitCell value={summary.lastMonth.profit} />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}

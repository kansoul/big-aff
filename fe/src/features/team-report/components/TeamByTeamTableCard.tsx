import { BarChart3 } from 'lucide-react'

import { Card, CardDescription, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { TeamReportByTeamRow } from '@/features/team-report/types'

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(val)
}

function ProfitCell({ value }: { value: number }) {
  return (
    <span
      className={`font-semibold ${value > 0 ? 'text-emerald-500 dark:text-emerald-400' : value < 0 ? 'text-rose-500 dark:text-rose-400' : 'text-muted-foreground'}`}
    >
      {formatCurrency(value)}
    </span>
  )
}

type Props = {
  data: TeamReportByTeamRow[]
  loading: boolean
}

export function TeamReportByTeamTableCard({ data, loading }: Props) {
  const totals = data.reduce(
    (acc, row) => ({
      revenue: acc.revenue + row.revenue,
      spend: acc.spend + row.spend,
      profit: acc.profit + row.profit,
    }),
    { revenue: 0, spend: 0, profit: 0 },
  )
  const totalRoi = totals.spend > 0 ? ((totals.revenue - totals.spend) / totals.spend) * 100 : 0

  return (
    <Card className="rounded-2xl border-border/50 shadow-sm overflow-hidden flex flex-col bg-card">
      <div className="flex items-center gap-3 border-b border-border/50 px-6 py-4 bg-muted/20">
        <BarChart3 className="h-4 w-4 text-muted-foreground/60" />
        <div>
          <CardTitle className="text-base font-bold">Revenue by Team</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            {loading ? '...' : `${data.length} team${data.length !== 1 ? 's' : ''}`}
          </CardDescription>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="whitespace-nowrap">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/50 bg-muted/10">
              <TableHead className="py-3 px-6 font-semibold text-muted-foreground w-[200px]">
                Team
              </TableHead>
              <TableHead className="font-semibold text-muted-foreground">Revenue</TableHead>
              <TableHead className="font-semibold text-muted-foreground">Spend</TableHead>
              <TableHead className="font-semibold text-muted-foreground">Profit</TableHead>
              <TableHead className="font-semibold text-muted-foreground pr-6">ROI %</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-6 py-4">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : data.map((row) => (
                  <TableRow
                    key={row.team_id}
                    className="border-b border-border/30 transition-colors hover:bg-muted/30"
                  >
                    <TableCell className="px-6 py-4 font-semibold text-foreground">
                      {row.team_name}
                    </TableCell>
                    <TableCell className="text-foreground font-medium">
                      {formatCurrency(row.revenue)}
                    </TableCell>
                    <TableCell className="text-foreground font-medium">
                      {formatCurrency(row.spend)}
                    </TableCell>
                    <TableCell>
                      <ProfitCell value={row.profit} />
                    </TableCell>
                    <TableCell className="pr-6">
                      <span
                        className={`font-semibold ${row.roi >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
                      >
                        {row.roi.toFixed(2)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>

          {!loading && data.length > 0 && (
            <TableBody>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-t-2 border-border">
                <TableCell className="px-6 py-4 font-bold text-foreground text-sm">
                  Summary
                </TableCell>
                <TableCell className="font-bold text-foreground">
                  {formatCurrency(totals.revenue)}
                </TableCell>
                <TableCell className="font-bold text-foreground">
                  {formatCurrency(totals.spend)}
                </TableCell>
                <TableCell>
                  <ProfitCell value={totals.profit} />
                </TableCell>
                <TableCell className="pr-6">
                  <span
                    className={`font-bold ${totalRoi >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
                  >
                    {totalRoi.toFixed(2)}%
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          )}
        </Table>
      </div>
    </Card>
  )
}

import { Calendar, ArrowUpRight, Activity, Target, Filter, Search } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div className="flex flex-col items-end gap-2">
          <Button
            variant="outline"
            className="font-mono text-xs font-semibold tracking-wider h-10 px-4 rounded-none border-border"
          >
            <Calendar className="mr-2 h-4 w-4" />
            OCT 01 — OCT 31, 2023
          </Button>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            REAL-TIME DATA AGGREGATION ACTIVE
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-none border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
              TOTAL SPEND
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">$142,850</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">+12.4% from last month</p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
              TOTAL REVENUE
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">$682,400</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">+8.2% from last month</p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-border shadow-none bg-foreground text-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
              OVERALL ROAS
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">4.78x</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">Target: 4.50x</p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
              CONVERSIONS
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black tracking-tighter">12,492</div>
            <p className="text-xs text-muted-foreground font-medium mt-1">-2.1% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart and Insights */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 rounded-none border-border shadow-none">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black tracking-tighter">
                Revenue vs Spend Distribution
              </CardTitle>
              <CardDescription className="text-xs font-medium mt-1">
                Cumulative weekly performance across all channels
              </CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold tracking-widest uppercase text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-foreground" />
                REVENUE
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-muted" />
                SPEND
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] flex items-end justify-between px-8 pb-4">
            {/* Placeholder for chart */}
            {[1, 2, 3, 4, 5].map((week) => (
              <div
                key={week}
                className="flex flex-col items-center gap-2 w-full h-full justify-end"
              >
                <div className="flex items-end gap-1 w-full h-[80%] px-4">
                  <div className="w-1/2 bg-muted h-[40%]" />
                  <div className="w-1/2 bg-foreground h-[80%]" />
                </div>
                <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  W{week}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-none border-border shadow-none bg-muted/30">
          <CardHeader>
            <CardTitle className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
              EDITORIAL INSIGHTS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-bold text-sm mb-2">ROAS EFFICIENCY PEAK</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Week 3 observed a peak efficiency of 6.33x ROAS, primarily driven by Facebook video
                assets.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-2">SCALING OPPORTUNITY</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Underspending in Search Retargeting by 15%. Recommend budget reallocation for Q4.
              </p>
            </div>
            <Button className="w-full rounded-none h-12 font-bold tracking-widest uppercase mt-4">
              DOWNLOAD FULL AUDIT
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <Card className="rounded-none border-border shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-6">
          <CardTitle className="text-xl font-black tracking-tighter">
            Campaign Performance
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-none">
              <Filter className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-none">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-y">
                <TableHead className="text-xs font-bold tracking-widest uppercase h-12">
                  CAMPAIGN NAME
                </TableHead>
                <TableHead className="text-xs font-bold tracking-widest uppercase h-12">
                  STATUS
                </TableHead>
                <TableHead className="text-xs font-bold tracking-widest uppercase h-12">
                  PLATFORM
                </TableHead>
                <TableHead className="text-xs font-bold tracking-widest uppercase h-12 text-right">
                  SPEND
                </TableHead>
                <TableHead className="text-xs font-bold tracking-widest uppercase h-12 text-right">
                  REVENUE
                </TableHead>
                <TableHead className="text-xs font-bold tracking-widest uppercase h-12 text-right">
                  ROAS
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="border-b">
                <TableCell className="font-bold py-6">Winter_Collection_Global</TableCell>
                <TableCell className="py-6">
                  <Badge
                    variant="default"
                    className="rounded-none text-[10px] font-black tracking-widest px-2 py-1 uppercase bg-foreground text-background"
                  >
                    ACTIVE
                  </Badge>
                </TableCell>
                <TableCell className="py-6">
                  <div className="flex items-center gap-2 font-medium">
                    <Search className="h-4 w-4" />
                    Google Ads
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium py-6">$42,500.00</TableCell>
                <TableCell className="text-right font-medium py-6">$212,500.00</TableCell>
                <TableCell className="text-right font-black py-6">5.00x</TableCell>
              </TableRow>
              <TableRow className="border-b">
                <TableCell className="font-bold py-6">Retargeting_High_Intent</TableCell>
                <TableCell className="py-6">
                  <Badge
                    variant="secondary"
                    className="rounded-none text-[10px] font-black tracking-widest px-2 py-1 uppercase bg-muted text-muted-foreground"
                  >
                    PAUSED
                  </Badge>
                </TableCell>
                <TableCell className="py-6">
                  <div className="flex items-center gap-2 font-medium">
                    <Activity className="h-4 w-4" />
                    Facebook Ads
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium py-6">$12,200.00</TableCell>
                <TableCell className="text-right font-medium py-6">$84,000.00</TableCell>
                <TableCell className="text-right font-black py-6">6.88x</TableCell>
              </TableRow>
              <TableRow className="border-b">
                <TableCell className="font-bold py-6">Brand_Awareness_USA</TableCell>
                <TableCell className="py-6">
                  <Badge
                    variant="default"
                    className="rounded-none text-[10px] font-black tracking-widest px-2 py-1 uppercase bg-foreground text-background"
                  >
                    ACTIVE
                  </Badge>
                </TableCell>
                <TableCell className="py-6">
                  <div className="flex items-center gap-2 font-medium">
                    <Search className="h-4 w-4" />
                    Google Ads
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium py-6">$65,000.00</TableCell>
                <TableCell className="text-right font-medium py-6">$195,000.00</TableCell>
                <TableCell className="text-right font-black py-6">3.00x</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div className="py-6 text-center">
            <Button
              variant="ghost"
              className="text-xs font-bold tracking-widest uppercase rounded-none hover:bg-transparent hover:text-primary"
            >
              VIEW ALL CAMPAIGNS →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

<?php

namespace App\Console\Commands;

use App\Models\RevenueChartReport;
use App\Models\RevenueReport;
use Carbon\Carbon;
use Illuminate\Console\Command;

class MigrateRevenueToChartCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'revenue:migrate-to-chart';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Migrate existing revenue reports to chart table (one record per day from 15/10 to now)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $startDate = Carbon::parse('2025-10-15')->startOfDay();
        $endDate = Carbon::now()->endOfDay();

        $reports = RevenueReport::query()
            ->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()])
            ->orderBy('date')
            ->get();

        if ($reports->isEmpty()) {
            $this->warn('No reports found to migrate.');

            return Command::SUCCESS;
        }

        $bar = $this->output->createProgressBar($reports->count());
        $bar->start();

        $migratedCount = 0;
        $skippedCount = 0;

        foreach ($reports as $report) {
            $reportDate = Carbon::parse($report->date)->startOfDay();

            if ($reportDate->lte(Carbon::now())) {
                try {
                    $exists = RevenueChartReport::where('style_code', $report->style_code)
                        ->where('channel_code', $report->channel_code)
                        ->whereDate('datetime', $reportDate->toDateString())
                        ->exists();

                    if ($exists) {
                        $skippedCount++;
                        $bar->advance();

                        continue;
                    }

                    RevenueChartReport::create([
                        'ad_client_id' => $report->ad_client_id,
                        'style_code' => $report->style_code,
                        'channel_code' => $report->channel_code,
                        'style_name' => $report->style_name,
                        'channel_name' => $report->channel_name,
                        'datetime' => $reportDate,

                        // Use original values (not divided by 24)
                        'page_views' => $report->page_views,
                        'clicks' => $report->clicks,
                        'ad_requests' => $report->ad_requests,
                        'impressions' => $report->impressions,
                        'ad_requests_rpm' => $report->ad_requests_rpm,
                        'impressions_rpm' => $report->impressions_rpm,
                        'estimated_earnings' => $report->estimated_earnings,
                        'cost_per_click' => $report->cost_per_click,

                        'funnel_requests' => $report->funnel_requests,
                        'funnel_impressions' => $report->funnel_impressions,
                        'funnel_clicks' => $report->funnel_clicks,
                        'funnel_rpm' => $report->funnel_rpm,
                    ]);

                    $migratedCount++;
                } catch (\Exception $e) {
                    $this->error("Error migrating report {$report->id}: " . $e->getMessage());
                }
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();

        $this->info("Migrated {$migratedCount} records successfully.");

        if ($skippedCount > 0) {
            $this->warn("Skipped {$skippedCount} records (already exist).");
        }

        return Command::SUCCESS;
    }
}

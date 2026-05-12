<?php

namespace App\Console\Commands;

use App\Services\Adx\AdxDailyReportAggregationService;
use App\Services\Integrations\Adx\AdxAdsSpendSyncService;
use App\Services\Integrations\Adx\AdxCampaignReportSyncService;
use App\Services\Integrations\Adx\AdxRevenueSyncService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncAdxReportsCommand extends Command
{
    protected $signature = 'adx:sync-reports
        {start_date? : Y-m-d formatted start date}
        {end_date? : Y-m-d formatted end date}';

    protected $description = 'Sync AdX spend, GAM revenue, and campaign reports';

    public function handle(
        AdxAdsSpendSyncService $spendSync,
        AdxRevenueSyncService $revenueSync,
        AdxDailyReportAggregationService $dailyReportSync,
        AdxCampaignReportSyncService $campaignReportSync,
    ): int {
        $this->call('adx:flush-realtime');

        $startDate = $this->argument('start_date')
            ? Carbon::parse($this->argument('start_date'))->toDateString()
            : Carbon::now()->subDay()->toDateString();

        $endDate = $this->argument('end_date')
            ? Carbon::parse($this->argument('end_date'))->toDateString()
            : Carbon::now()->toDateString();

        try {
            $spendCount = $spendSync->sync($startDate, $endDate);
            $revenueCount = $revenueSync->sync($startDate, $endDate);
            $linkLevelCount = $dailyReportSync->sync($startDate, $endDate);
            $campaignCount = $campaignReportSync->sync($startDate, $endDate);

            $this->info("Synced AdX reports from {$startDate} to {$endDate}: spend={$spendCount}, revenue={$revenueCount}, link_level={$linkLevelCount}, campaigns={$campaignCount}.");

            return Command::SUCCESS;
        } catch (Throwable $e) {
            Log::channel('sync_reports')->error('[AdXReports] Sync failed', [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'error' => $e->getMessage(),
            ]);

            $this->error('Exception syncing AdX reports: '.$e->getMessage());

            return Command::FAILURE;
        }
    }
}

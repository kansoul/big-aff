<?php

namespace App\Console\Commands;

use App\Services\Integrations\Facebook\FacebookCampaignSyncService;
use App\Services\Integrations\Google\GoogleCampaignSyncService;
use App\Services\Integrations\TikTok\TikTokCampaignSyncService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncCampaignReportsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reports:sync-all
        {start_date? : Y-m-d formatted start date}
        {end_date? : Y-m-d formatted end date}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync all reports from Facebook, Google Ads, and TikTok';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $logger = Log::channel('sync_reports');

        // Flush realtime Redis tracking data into tracking_daily first so that
        // the campaign report aggregation reflects the latest realtime counts.
        $this->call('tracking:flush-daily');

        $startDate = $this->argument('start_date') ? Carbon::parse($this->argument('start_date'))->toDateString() : Carbon::now()->subDay()->toDateString();
        $endDate = $this->argument('end_date') ? Carbon::parse($this->argument('end_date'))->toDateString() : Carbon::now()->toDateString();

        try {
            GoogleCampaignSyncService::sync([
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]);
        } catch (Throwable $e) {
            $logger->error('[SyncAllReports][GoogleAds] Throwable', [
                'error' => $e->getMessage(),
            ]);
            $this->error('Exception syncing Google Ads campaigns: '.$e->getMessage());
        }

        try {
            TikTokCampaignSyncService::sync([
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]);
        } catch (Throwable $e) {
            $logger->error('[SyncAllReports][TikTok] Throwable', [
                'error' => $e->getMessage(),
            ]);
            $this->error('Exception syncing TikTok campaigns: '.$e->getMessage());
        }

        try {
            FacebookCampaignSyncService::sync([
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]);
        } catch (Throwable $e) {
            $logger->error('[SyncAllReports][Facebook] Throwable', [
                'error' => $e->getMessage(),
            ]);
            $this->error('Exception syncing Facebook campaigns: '.$e->getMessage());
        }

        return Command::SUCCESS;
    }
}

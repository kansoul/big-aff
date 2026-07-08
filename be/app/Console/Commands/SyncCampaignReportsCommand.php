<?php

namespace App\Console\Commands;

use App\Models\AdClient;
use App\Services\Integrations\Adsense\RevenueReportSyncService;
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
    protected $description = 'Sync all reports from Adsense, Facebook, Google Ads, and TikTok';

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

        $failedAdClientIds = false;

        try {
            $adClientIds = AdClient::query()
                ->whereNotNull('ad_client_id')
                ->pluck('ad_client_id')
                ->filter(fn ($v) => trim((string) $v) !== '')
                ->values();

            foreach ($adClientIds as $adClientId) {
                try {
                    $this->line("Syncing AdSense client: {$adClientId}");

                    $resp = RevenueReportSyncService::sync([
                        'ad_client_id' => $adClientId,
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                    ]);

                    if (! ($resp['success'] ?? false)) {
                        $failedAdClientIds = true;
                        $logger->error('[SyncAllReports][Adsense] Sync failed', [
                            'ad_client_id' => $adClientId,
                            'message' => $resp['message'] ?? null,
                        ]);
                        $this->error("Failed to sync AdSense client {$adClientId}: ".($resp['message'] ?? 'Unknown error'));
                    }
                } catch (Throwable $e) {
                    $failedAdClientIds = true;
                    $logger->error('[SyncAllReports][Adsense] Throwable', [
                        'ad_client_id' => $adClientId,
                        'error' => $e->getMessage(),
                    ]);
                    $this->error("Exception syncing AdSense client {$adClientId}: ".$e->getMessage());
                }
            }
        } catch (Throwable $e) {
            $logger->error('[SyncAllReports][Adsense] Fatal error', [
                'error' => $e->getMessage(),
            ]);
            $this->error('Fatal error in AdSense sync: '.$e->getMessage());
        }

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
                'failed_ad_client_ids' => $failedAdClientIds,
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

<?php

namespace App\Console\Commands;

use App\Services\Integrations\TikTok\TikTokCampaignSyncService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncTikTokCampaignReportsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tiktok-ads:sync-campaign-reports
        {start_date? : Y-m-d formatted start date, defaults to yesterday}
        {end_date? : Y-m-d formatted end date, defaults to today}
        {--account-id= : Comma-separated TikTok advertiser account_id(s); defaults to all ACTIVE TikTok accounts}
        {--flush-tracking : Flush Redis realtime tracking counts into tracking_daily before syncing}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync TikTok campaigns and campaign reports only (no Google Ads)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $logger = Log::channel('sync_reports');

        // Off by default: the every-minute tracking:flush-daily schedule already
        // covers this, and running both at once would flush concurrently.
        if ($this->option('flush-tracking')) {
            $this->call('tracking:flush-daily');
        }

        $startDate = $this->argument('start_date')
            ? Carbon::parse($this->argument('start_date'))->toDateString()
            : Carbon::now()->subDay()->toDateString();

        $endDate = $this->argument('end_date')
            ? Carbon::parse($this->argument('end_date'))->toDateString()
            : Carbon::now()->toDateString();

        $accountIds = collect(explode(',', (string) $this->option('account-id')))
            ->map(fn (string $id): string => trim($id))
            ->filter()
            ->values()
            ->all();

        $payload = [
            'start_date' => $startDate,
            'end_date' => $endDate,
        ];

        if (! empty($accountIds)) {
            $payload['account_id'] = $accountIds;
        }

        $scope = empty($accountIds) ? 'all ACTIVE TikTok accounts' : implode(', ', $accountIds);
        $this->info("Syncing TikTok campaigns & campaign reports for [{$scope}] from {$startDate} to {$endDate}...");

        try {
            TikTokCampaignSyncService::sync($payload);
        } catch (Throwable $e) {
            $logger->error('[SyncTikTokCampaignReports] Throwable', [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'account_id' => $accountIds,
                'error' => $e->getMessage(),
            ]);
            $this->error('Exception syncing TikTok campaigns: '.$e->getMessage());

            return Command::FAILURE;
        }

        $this->info('Done.');

        return Command::SUCCESS;
    }
}

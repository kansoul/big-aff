<?php

namespace App\Console\Commands;

use App\Services\Integrations\Adx\AdxCampaignSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncAdxCampaignsCommand extends Command
{
    protected $signature = 'adx:sync-campaigns';

    protected $description = 'Sync all ADX campaigns and ensure GAM custom targeting values exist';

    public function handle(AdxCampaignSyncService $campaignSync): int
    {
        try {
            $count = $campaignSync->sync();

            $this->info("Synced {$count} ADX campaigns with GAM targeting.");

            return Command::SUCCESS;
        } catch (Throwable $e) {
            Log::channel('sync_reports')->error('[AdxCampaigns] Sync failed', [
                'error' => $e->getMessage(),
            ]);

            $this->error('Exception syncing ADX campaigns: '.$e->getMessage());

            return Command::FAILURE;
        }
    }
}

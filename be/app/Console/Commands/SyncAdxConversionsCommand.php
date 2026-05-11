<?php

namespace App\Console\Commands;

use App\Services\Integrations\Adx\AdxConversionSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncAdxConversionsCommand extends Command
{
    protected $signature = 'adx:sync-conversions';

    protected $description = 'Push pending ADX conversions to Google Ads';

    public function handle(AdxConversionSyncService $service): int
    {
        try {
            $count = $service->sync();
            $this->info("Synced {$count} ADX conversions to Google Ads.");

            return Command::SUCCESS;
        } catch (Throwable $e) {
            Log::channel('sync_reports')->error('[AdxConversions] Sync failed', [
                'error' => $e->getMessage(),
            ]);
            $this->error('Exception syncing ADX conversions: '.$e->getMessage());

            return Command::FAILURE;
        }
    }
}

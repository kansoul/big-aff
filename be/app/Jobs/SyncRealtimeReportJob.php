<?php

namespace App\Jobs;

use App\Services\Integrations\Tracking\RealtimeReportSyncService;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Reconciliation job — re-aggregates event counts from raw event tables
 * into tracking_daily for a specific date and link_data_id.
 *
 * This is NOT dispatched after every event (that is handled by the atomic
 * increment in SaveTrackingLogJob). Use this job for scheduled nightly
 * reconciliation or manual backfills to correct any drift.
 */
class SyncRealtimeReportJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    /**
     * Deduplicate reconciliation jobs for the same date + link within a 10-minute window.
     */
    public int $uniqueFor = 600;

    public function __construct(
        public string $dateOnly,
        public int $linkDataId,
    ) {
        $this->onQueue('tracking-sync');
    }

    public function uniqueId(): string
    {
        return implode(':', ['sync_tracking_daily', $this->dateOnly, $this->linkDataId]);
    }

    public function handle(): void
    {
        try {
            RealtimeReportSyncService::syncLinkDataForDate($this->dateOnly, $this->linkDataId);
        } catch (Exception $e) {
            Log::channel('tracking_events')->warning('RealtimeReport reconciliation failed', [
                'timestamp' => now(),
                'link_data_id' => $this->linkDataId,
                'date' => $this->dateOnly,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    public function failed(Throwable $exception): void
    {
        Log::channel('tracking_events')->critical('SyncRealtimeReportJob failed after all retries', [
            'timestamp' => now(),
            'link_data_id' => $this->linkDataId,
            'date' => $this->dateOnly,
            'error' => $exception->getMessage(),
            'stack_trace' => $exception->getTraceAsString(),
        ]);
    }
}

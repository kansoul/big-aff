<?php

namespace App\Console\Commands;

use App\Services\RealtimeReportSyncService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ReconcileRealtimeReportCommand extends Command
{
    protected $signature = 'tracking:reconcile
        {--date=        : Reconcile a single date (Y-m-d). Defaults to yesterday.}
        {--start-date=  : Start of a date range (Y-m-d).}
        {--end-date=    : End of a date range (Y-m-d). Defaults to yesterday.}';

    protected $description = 'Re-aggregate raw event counts and overwrite tracking_daily (nightly reconciliation)';

    public function handle(): void
    {
        [$startDate, $endDate] = $this->resolveDateRange();

        $this->info("Reconciling tracking_daily from {$startDate} to {$endDate}…");

        $result = RealtimeReportSyncService::sync([
            'start_date' => $startDate,
            'end_date' => $endDate,
        ]);

        if ($result['success']) {
            $this->info($result['message']);
            Log::channel('sync_reports')->info('[TrackingReconcile] Completed', [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'synced_count' => $result['synced_count'],
                'error_count' => $result['error_count'],
            ]);
        } else {
            $this->error($result['message']);
            Log::channel('sync_reports')->error('[TrackingReconcile] Failed', [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'error' => $result['message'],
            ]);
        }
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function resolveDateRange(): array
    {
        if ($date = $this->option('date')) {
            return [$date, $date];
        }

        $yesterday = now()->subDay()->toDateString();

        return [
            $this->option('start-date') ?? $yesterday,
            $this->option('end-date') ?? $yesterday,
        ];
    }
}

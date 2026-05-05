<?php

namespace App\Jobs;

use App\Actions\MainSystem\SendMainSystemInsightReportsAction;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendMainSystemInsightReportsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 120;

    public int $tries = 3;

    /**
     * @param  list<array<string, mixed>>  $accounts
     * @param  list<array<string, mixed>>  $campaigns
     * @param  list<array<string, mixed>>  $insights
     */
    public function __construct(
        public array $accounts,
        public array $campaigns,
        public array $insights,
    ) {}

    public function handle(SendMainSystemInsightReportsAction $action): void
    {
        $action->execute($this->accounts, $this->campaigns, $this->insights);
    }

    public function failed(Throwable $exception): void
    {
        Log::channel('sync_reports')->error('[MainSystemSync] Failed to send insight reports', [
            'error' => $exception->getMessage(),
            'insights_count' => count($this->insights),
        ]);
    }
}

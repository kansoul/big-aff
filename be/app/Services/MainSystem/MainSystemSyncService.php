<?php

namespace App\Services\MainSystem;

use App\Actions\MainSystem\ReceiveMainSystemInsightReportsAction;
use App\Jobs\SendMainSystemInsightReportsJob;

class MainSystemSyncService
{
    public function __construct(
        private readonly ReceiveMainSystemInsightReportsAction $receiveInsightReportsAction,
        private readonly MainSystemHttpClient $mainSystemHttpClient,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public function receiveInsightReports(array $payload, ?string $token): void
    {
        $this->receiveInsightReportsAction->execute($payload, $token);
    }

    /**
     * @param  list<array<string, mixed>>  $accounts
     * @param  list<array<string, mixed>>  $campaigns
     * @param  list<array<string, mixed>>  $insights
     */
    public function dispatchInsightReports(array $accounts, array $campaigns, array $insights): void
    {
        if (! $this->mainSystemHttpClient->shouldPush() || $insights === []) {
            return;
        }

        SendMainSystemInsightReportsJob::dispatch($accounts, $campaigns, $insights)
            ->onQueue(config('queue.queues.main-system-sync'));
    }
}

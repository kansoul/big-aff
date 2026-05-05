<?php

namespace App\Services\MainSystem;

use App\Actions\MainSystem\ReceiveMainSystemChannelsAction;
use App\Actions\MainSystem\ReceiveMainSystemInsightReportsAction;
use App\Jobs\SendMainSystemChannelsJob;
use App\Jobs\SendMainSystemInsightReportsJob;
use Illuminate\Support\Facades\Log;

class MainSystemSyncService
{
    public function __construct(
        private readonly ReceiveMainSystemInsightReportsAction $receiveInsightReportsAction,
        private readonly ReceiveMainSystemChannelsAction $receiveChannelsAction,
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
     * @param  array<string, mixed>  $payload
     */
    public function receiveChannels(array $payload, ?string $token): void
    {
        $this->receiveChannelsAction->execute($payload, $token);
    }

    /**
     * @param  list<array<string, mixed>>  $accounts
     * @param  list<array<string, mixed>>  $campaigns
     * @param  list<array<string, mixed>>  $insights
     */
    public function dispatchInsightReports(array $accounts, array $campaigns, array $insights): void
    {
        if (! $this->mainSystemHttpClient->shouldPush()) {
            Log::channel('sync_reports')->warning('[MainSystemSync] Insight dispatch skipped: push disabled', [
                'blockers' => $this->mainSystemHttpClient->pushBlockers(),
                'accounts_count' => count($accounts),
                'campaigns_count' => count($campaigns),
                'insights_count' => count($insights),
            ]);

            return;
        }

        if ($insights === []) {
            Log::channel('sync_reports')->info('[MainSystemSync] Insight dispatch skipped: empty insights', [
                'accounts_count' => count($accounts),
                'campaigns_count' => count($campaigns),
            ]);

            return;
        }

        SendMainSystemInsightReportsJob::dispatch($accounts, $campaigns, $insights)
            ->onQueue(config('queue.queues.main-system-sync'));

        Log::channel('sync_reports')->info('[MainSystemSync] Insight send job dispatched', [
            'queue' => config('queue.queues.main-system-sync'),
            'accounts_count' => count($accounts),
            'campaigns_count' => count($campaigns),
            'insights_count' => count($insights),
        ]);
    }

    public function dispatchChannels(): void
    {
        if (! $this->mainSystemHttpClient->shouldPush()) {
            Log::channel('sync_reports')->warning('[MainSystemSync] Channel dispatch skipped: push disabled', [
                'blockers' => $this->mainSystemHttpClient->pushBlockers(),
            ]);

            return;
        }

        SendMainSystemChannelsJob::dispatch()
            ->onQueue(config('queue.queues.main-system-sync'));

        Log::channel('sync_reports')->info('[MainSystemSync] Channel send job dispatched', [
            'queue' => config('queue.queues.main-system-sync'),
        ]);
    }
}

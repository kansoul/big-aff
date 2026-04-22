<?php

namespace App\Jobs;

use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
use App\Services\Integrations\Facebook\FacebookAdsAdsetService;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class FetchAccountAdsAndAdsetsJob implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;

    public int $tries = 3;

    public array $backoff = [30, 60, 120];

    public function __construct(
        public readonly string $accountId,
        public readonly array $campaignIds,
        public readonly string $date,
    ) {
        $this->onQueue(config('queue.queues.fetch-ads-adsets'));
    }

    public function handle(FacebookAdsAdsetService $facebookService): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        $data = $facebookService->getAccountWithAdsAndAdsets($this->accountId, $this->campaignIds, $this->date);

        if (! $data) {
            return;
        }

        DB::transaction(function () use ($data): void {
            collect($data['adsets'])->chunk(500)->each(function ($chunk): void {
                AdsetInsightsReport::upsert(
                    $chunk->values()->all(),
                    ['adset_id', 'date_start'],
                );
            });

            collect($data['ads'])->chunk(500)->each(function ($chunk): void {
                AdsInsightsReport::upsert(
                    $chunk->values()->all(),
                    ['ad_id', 'date_start'],
                );
            });
        });
    }

    public function failed(Throwable $e): void
    {
        Log::channel('fetch_ads_and_adsets')->error(
            "FetchAccountAdsAndAdsetsJob failed for account {$this->accountId} on {$this->date}: {$e->getMessage()}",
            ['campaign_ids_count' => count($this->campaignIds)],
        );
    }
}

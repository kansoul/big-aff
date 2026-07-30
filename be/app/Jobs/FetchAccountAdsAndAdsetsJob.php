<?php

namespace App\Jobs;

use App\Actions\CampaignRule\AutoMatchAdAdsetRulesAction;
use App\Enums\AdsType;
use App\Enums\EntityTypeEnum;
use App\Models\Account;
use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
use App\Services\Integrations\Contracts\AdsAdsetProvider;
use App\Services\Integrations\TikTok\TikTokAdsAdsetService;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use LogicException;
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
        public readonly string $adsType = AdsType::TIKTOK->value,
    ) {
        $this->onQueue(config('queue.queues.fetch-ads-adsets'));
    }

    public function handle(AutoMatchAdAdsetRulesAction $autoMatchAction): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        if (! $this->shouldFetchAccount()) {
            return;
        }

        $data = $this->provider()->getAccountWithAdsAndAdsets($this->accountId, $this->campaignIds, $this->date);

        if (! $data) {
            return;
        }

        DB::transaction(function () use ($data, $autoMatchAction): void {
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

            $this->runAutoMatch($data, $autoMatchAction);
        });

        $this->dispatchRuleEvaluationJobs($data);
    }

    /**
     * Resolve the provider-specific ads/adset service for this job's ads type.
     */
    private function provider(): AdsAdsetProvider
    {
        return match ($this->adsType) {
            AdsType::TIKTOK->value => app(TikTokAdsAdsetService::class),
            default => throw new LogicException("Unsupported ads provider: {$this->adsType}"),
        };
    }

    private function shouldFetchAccount(): bool
    {
        if (! config('main_system.is_main')) {
            return true;
        }

        $account = Account::query()
            ->with('mainTeam')
            ->where('account_id', $this->accountId)
            ->where('ads_type', $this->adsType)
            ->first();

        if (! $account || empty($account->main_team_id)) {
            return true;
        }

        return (bool) $account->mainTeam?->sync_campaign_reports;
    }

    /**
     * Dispatch per-entity jobs to evaluate ad/adset rules for ACTIVE records
     * fetched on $this->date.
     *
     * @param  array{adsets: array<int, array<string, mixed>>, ads: array<int, array<string, mixed>>}  $data
     */
    private function dispatchRuleEvaluationJobs(array $data): void
    {
        if (! empty($data['adsets'])) {
            $adsetIds = array_values(array_unique(array_filter(
                array_column($data['adsets'], 'adset_id'),
            )));

            if (! empty($adsetIds)) {
                AdsetInsightsReport::query()
                    ->whereIn('adset_id', $adsetIds)
                    ->where('status', 'ACTIVE')
                    ->whereDate('date_start', $this->date)
                    ->whereHas('campaign', fn ($q) => $q->where('status', 'ACTIVE'))
                    ->whereHas('campaignRules', $this->activeRuleConstraint())
                    ->pluck('adset_id')
                    ->each(function (string $adsetId): void {
                        EvaluateAdAdsetRuleJob::dispatch(
                            AdsetInsightsReport::class,
                            $adsetId,
                            $this->date,
                        );
                    });
            }
        }

        if (! empty($data['ads'])) {
            $adIds = array_values(array_unique(array_filter(
                array_column($data['ads'], 'ad_id'),
            )));

            if (! empty($adIds)) {
                AdsInsightsReport::query()
                    ->whereIn('ad_id', $adIds)
                    ->where('status', 'ACTIVE')
                    ->whereDate('date_start', $this->date)
                    ->whereHas('campaign', fn ($q) => $q->where('status', 'ACTIVE'))
                    ->whereHas('campaignRules', $this->activeRuleConstraint())
                    ->pluck('ad_id')
                    ->each(function (string $adId): void {
                        EvaluateAdAdsetRuleJob::dispatch(
                            AdsInsightsReport::class,
                            $adId,
                            $this->date,
                        );
                    });
            }
        }
    }

    /**
     * Constraint matching an active, non-expired ad/adset rule. Pre-filtering at
     * dispatch keeps the queue from flooding with no-op jobs for ads/adsets that
     * have no rule attached (the rule check would otherwise happen inside the job).
     *
     * @return \Closure(Builder): void
     */
    private function activeRuleConstraint(): \Closure
    {
        return fn ($q) => $q
            ->where('entity_type', EntityTypeEnum::AdAdset->value)
            ->where('is_active', true)
            ->where(fn ($q2) => $q2->whereNull('expired_at')->orWhereDate('expired_at', '>=', now()->toDateString()));
    }

    /**
     * @param  array{adsets: array<int, array<string, mixed>>, ads: array<int, array<string, mixed>>}  $data
     */
    private function runAutoMatch(array $data, AutoMatchAdAdsetRulesAction $action): void
    {
        $adIds = array_values(array_unique(array_filter(
            array_column($data['ads'] ?? [], 'ad_id'),
        )));

        $adsetIds = array_values(array_unique(array_filter(
            array_column($data['adsets'] ?? [], 'adset_id'),
        )));

        if (empty($adIds) && empty($adsetIds)) {
            return;
        }

        $ads = ! empty($adIds)
            ? AdsInsightsReport::whereIn('ad_id', $adIds)->get()
            : collect();

        $adsets = ! empty($adsetIds)
            ? AdsetInsightsReport::whereIn('adset_id', $adsetIds)->get()
            : collect();

        $action->execute($ads, $adsets);
    }

    public function failed(Throwable $e): void
    {
        Log::channel('fetch_ads_and_adsets')->error(
            "FetchAccountAdsAndAdsetsJob failed for account {$this->accountId} on {$this->date}: {$e->getMessage()}",
            ['campaign_ids_count' => count($this->campaignIds)],
        );
    }
}

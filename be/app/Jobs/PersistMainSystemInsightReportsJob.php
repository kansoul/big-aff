<?php

namespace App\Jobs;

use App\Models\Account;
use App\Models\Campaign;
use App\Models\InsightReport;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class PersistMainSystemInsightReportsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 300;

    public int $tries = 3;

    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(
        public int $mainTeamId,
        public array $payload,
    ) {}

    public function handle(): void
    {
        $now = now();

        $accounts = collect($this->payload['accounts'] ?? [])
            ->map(fn (array $account) => [
                'account_id' => $account['account_id'],
                'account_name' => $account['account_name'] ?? null,
                'ads_type' => $account['ads_type'],
                'status' => $account['status'] ?? null,
                'is_special' => (bool) ($account['is_special'] ?? false),
                'sync_to_mcc' => (bool) ($account['sync_to_mcc'] ?? false),
                'main_team_id' => $this->mainTeamId,
                'team_id' => null,
                'deleted_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ])
            ->values()
            ->all();

        $campaigns = collect($this->payload['campaigns'] ?? [])
            ->map(fn (array $campaign) => [
                'account_id' => $campaign['account_id'] ?? null,
                'ads_type' => $campaign['ads_type'],
                'campaign_id' => $campaign['campaign_id'],
                'campaign_name' => $campaign['campaign_name'] ?? null,
                'daily_budget' => $campaign['daily_budget'] ?? null,
                'lifetime_budget' => $campaign['lifetime_budget'] ?? null,
                'status' => $campaign['status'] ?? null,
                'start_time' => $this->normalizeDateTime($campaign['start_time'] ?? null),
                'stop_time' => $this->normalizeDateTime($campaign['stop_time'] ?? null),
                'created_time' => $this->normalizeDateTime($campaign['created_time'] ?? null),
                'updated_time' => $this->normalizeDateTime($campaign['updated_time'] ?? null),
                'deleted_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ])
            ->values()
            ->all();

        $insights = collect($this->payload['insights'] ?? [])
            ->map(fn (array $insight) => [
                'account_id' => $insight['account_id'],
                'campaign_id' => $insight['campaign_id'],
                'date_start' => $this->normalizeDate($insight['date_start']),
                'impressions' => $insight['impressions'] ?? null,
                'reach' => $insight['reach'] ?? null,
                'clicks' => $insight['clicks'] ?? null,
                'ad_clicks' => $insight['ad_clicks'] ?? null,
                'article_views' => $insight['article_views'] ?? null,
                'search_views' => $insight['search_views'] ?? null,
                'search_clicks' => $insight['search_clicks'] ?? null,
                'cpa' => $insight['cpa'] ?? null,
                'ctr_link' => $insight['ctr_link'] ?? null,
                'cpc_link' => $insight['cpc_link'] ?? null,
                'spend' => $insight['spend'] ?? null,
                'cpc' => $insight['cpc'] ?? null,
                'cpm' => $insight['cpm'] ?? null,
                'ctr' => $insight['ctr'] ?? null,
                'frequency' => $insight['frequency'] ?? null,
                'spend_type' => $insight['spend_type'] ?? null,
                'deleted_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ])
            ->values()
            ->all();

        DB::transaction(function () use ($accounts, $campaigns, $insights): void {
            if ($accounts !== []) {
                Account::query()->upsert(
                    $accounts,
                    ['account_id'],
                    ['account_name', 'ads_type', 'status', 'is_special', 'sync_to_mcc', 'main_team_id', 'deleted_at', 'updated_at'],
                );
            }

            if ($campaigns !== []) {
                Campaign::query()->upsert(
                    $campaigns,
                    ['campaign_id'],
                    ['account_id', 'ads_type', 'campaign_name', 'daily_budget', 'lifetime_budget', 'status', 'start_time', 'stop_time', 'created_time', 'updated_time', 'deleted_at', 'updated_at'],
                );
            }

            if ($insights !== []) {
                InsightReport::query()->upsert(
                    $insights,
                    ['account_id', 'campaign_id', 'date_start'],
                    ['impressions', 'reach', 'clicks', 'ad_clicks', 'article_views', 'search_views', 'search_clicks', 'cpa', 'ctr_link', 'cpc_link', 'spend', 'cpc', 'cpm', 'ctr', 'frequency', 'spend_type', 'deleted_at', 'updated_at'],
                );
            }
        });

        Log::channel('sync_reports')->info('[MainSystemSync] Persisted insight payload', [
            'main_team_id' => $this->mainTeamId,
            'accounts_count' => count($accounts),
            'campaigns_count' => count($campaigns),
            'insights_count' => count($insights),
        ]);
    }

    public function failed(Throwable $exception): void
    {
        Log::channel('sync_reports')->error('[MainSystemSync] Failed to persist insight reports', [
            'error' => $exception->getMessage(),
            'main_team_id' => $this->mainTeamId,
        ]);
    }

    private function normalizeDateTime(mixed $value): ?string
    {
        if (blank($value)) {
            return null;
        }

        try {
            return Carbon::parse($value)->toDateTimeString();
        } catch (Throwable $exception) {
            Log::channel('sync_reports')->warning('[MainSystemSync] Invalid datetime received while persisting insight payload', [
                'value' => $value,
                'error' => $exception->getMessage(),
                'main_team_id' => $this->mainTeamId,
            ]);

            return null;
        }
    }

    private function normalizeDate(mixed $value): string
    {
        return Carbon::parse($value)->toDateString();
    }
}

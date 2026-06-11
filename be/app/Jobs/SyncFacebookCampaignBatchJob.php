<?php

namespace App\Jobs;

use App\Models\Campaign;
use App\Models\InsightReport;
use App\Services\Integrations\Facebook\FacebookAdsService;
use App\Services\MainSystem\MainSystemSyncService;
use App\Support\ReportOwner\ReportOwnerResolver;
use Carbon\Carbon;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncFacebookCampaignBatchJob implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;

    public int $tries = 2;

    private const MAX_RETRY_ATTEMPTS = 3;

    public function __construct(
        public array $accountBatch,
        public array $tokenConfig,
        public string $startDate,
        public string $endDate,
        public int $batchIndex,
        public int $tokenConfigIndex,
        public int $retryAttempt = 0,
    ) {
        $this->onQueue(config('queue.queues.all-reports-sync'));
    }

    public function handle(): void
    {
        $service = app(FacebookAdsService::class);

        $service->configure(
            accessToken: $this->tokenConfig['access_token'],
            appSecret: $this->tokenConfig['app_secret'],
            appId: $this->tokenConfig['app_id']
        );

        $failedAccounts = [];
        $ownerResolver = new ReportOwnerResolver;

        foreach ($this->accountBatch as $accountData) {
            $account = is_array($accountData) ? (object) $accountData : $accountData;

            try {
                $insights = $service->getCampaignInsights($account->account_id, $this->startDate, $this->endDate);
                if ($insights === null) {
                    $failedAccounts[] = $accountData;

                    continue;
                }
                if (empty($insights)) {
                    continue;
                }

                $insightCampaignIds = array_unique(array_column($insights, 'campaign_id'));
                $existingCampaignIds = Campaign::whereIn('campaign_id', $insightCampaignIds)
                    ->pluck('campaign_id')
                    ->toArray();
                $missingCampaignIds = array_diff($insightCampaignIds, $existingCampaignIds);

                $cacheKey = 'fb_campaign_fetch_time_'.$account->account_id;
                $lastFetchTime = cache()->get($cacheKey);
                $is15MinInterval = ! $lastFetchTime || (time() - $lastFetchTime) >= 12 * 60;
                $today = Carbon::today()->toDateString();
                $isSyncToday = $this->endDate >= $today;

                $filteredCampaigns = [];

                if ($is15MinInterval || ! empty($missingCampaignIds) || ! $isSyncToday) {
                    $filteredCampaigns = $service->getCampaignsFilteredByInsights($account->account_id, $insights);
                    if ($filteredCampaigns === null) {
                        $failedAccounts[] = $accountData;

                        continue;
                    }

                    if ($is15MinInterval && $isSyncToday) {
                        cache()->put($cacheKey, time(), now()->addHours(1));
                    }
                }

                $owner = $ownerResolver->forAccountId($account->account_id);

                $insightsData = DB::transaction(function () use ($insights, $filteredCampaigns, $isSyncToday, $owner) {
                    if (! empty($filteredCampaigns)) {
                        Campaign::upsert(
                            $filteredCampaigns,
                            ['campaign_id'],
                            ['campaign_name', 'daily_budget', 'lifetime_budget', 'status', 'start_time', 'stop_time', 'created_time', 'updated_time', 'created_at', 'updated_at']
                        );
                        if ($isSyncToday) {
                            $activeCampaignIds = [];
                            foreach ($filteredCampaigns as $campaign) {
                                if (($campaign['status'] ?? '') === 'ACTIVE') {
                                    $activeCampaignIds[] = $campaign['campaign_id'];
                                }
                            }

                            if (! empty($activeCampaignIds)) {
                                ApplyCampaignNameToRuleJob::dispatch($activeCampaignIds);
                            }
                        }
                    }

                    $insightsData = array_map(function ($insight) use ($owner) {
                        return [
                            'account_id' => $insight['account_id'],
                            'campaign_id' => $insight['campaign_id'],
                            'date_start' => $insight['date_start'],
                            'impressions' => $insight['impressions'],
                            'clicks' => $insight['clicks'],
                            'reach' => $insight['reach'],
                            'ad_clicks' => $insight['link_clicks'],
                            'cpa' => $insight['cpa'],
                            'search_clicks' => $insight['fb_clicks'],
                            'ctr_link' => $insight['ctr_link'],
                            'cpc_link' => $insight['cpc_link'],
                            'article_views' => $insight['article_views'],
                            'search_views' => $insight['search_views'],
                            'spend' => $insight['spend'],
                            'cpc' => $insight['cpc'],
                            'cpm' => $insight['cpm'],
                            'ctr' => $insight['ctr'],
                            'frequency' => $insight['frequency'],
                            'spend_type' => $insight['spend_type'],
                            'owner_user_id' => $owner['owner_user_id'],
                            'owner_main_team_id' => $owner['owner_main_team_id'] ?? null,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                    }, $insights);

                    InsightReport::upsert(
                        $insightsData,
                        ['account_id', 'campaign_id', 'date_start'],
                        ['impressions', 'clicks', 'reach', 'ad_clicks', 'cpa', 'search_clicks', 'ctr_link', 'cpc_link', 'article_views', 'search_views', 'spend', 'cpc', 'cpm', 'ctr', 'frequency', 'spend_type', 'owner_user_id', 'owner_main_team_id', 'updated_at']
                    );

                    return $insightsData;
                });

                $campaignPayloads = Campaign::query()
                    ->whereIn('campaign_id', array_unique(array_column($insightsData, 'campaign_id')))
                    ->get([
                        'account_id',
                        'ads_type',
                        'campaign_id',
                        'campaign_name',
                        'daily_budget',
                        'lifetime_budget',
                        'status',
                        'start_time',
                        'stop_time',
                        'created_time',
                        'updated_time',
                    ])
                    ->toArray();

                app(MainSystemSyncService::class)->dispatchInsightReports(
                    accounts: [[
                        'account_id' => $account->account_id,
                        'account_name' => $account->account_name ?? null,
                        'ads_type' => $account->ads_type ?? 'facebook',
                        'status' => $account->status ?? null,
                        'is_special' => (bool) ($account->is_special ?? false),
                        'sync_to_mcc' => (bool) ($account->sync_to_mcc ?? false),
                    ]],
                    campaigns: $campaignPayloads,
                    insights: $insightsData,
                );
            } catch (Throwable $th) {
                Log::error('SyncFacebookCampaignBatchJob error for account '.$account->account_id.': '.$th->getMessage());
                $failedAccounts[] = $accountData;
            }
            sleep(2);
        }

        if (! empty($failedAccounts) && $this->retryAttempt < self::MAX_RETRY_ATTEMPTS) {
            $this->retryFailedAccounts($failedAccounts);
            sleep(2);
        } elseif (! empty($failedAccounts)) {
            Log::error('Failed accounts exceeded max retry attempts', [
                'failed_count' => array_map(fn ($account) => $account['account_id'], $failedAccounts),
            ]);
        }
    }

    private function retryFailedAccounts(array $failedAccounts): void
    {
        $retryJob = new self(
            accountBatch: $failedAccounts,
            tokenConfig: $this->tokenConfig,
            startDate: $this->startDate,
            endDate: $this->endDate,
            batchIndex: $this->batchIndex,
            tokenConfigIndex: $this->tokenConfigIndex,
            retryAttempt: $this->retryAttempt + 1,
        );

        if ($this->batch()) {
            $this->batch()->add($retryJob);
        } else {
            dispatch($retryJob);
            Log::warning('SyncFacebookCampaignBatchJob retry dispatched outside batch context', [
                'retry_attempt' => $this->retryAttempt + 1,
            ]);
        }
    }
}

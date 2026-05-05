<?php

namespace App\Services\Integrations\Facebook;

use App\Enums\AdsType;
use App\Jobs\EvaluateCampaignRuleJob;
use App\Jobs\SyncFacebookCampaignBatchJob;
use App\Models\Account;
use App\Models\Campaign;
use App\Services\Integrations\CampaignReportSyncService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Log;

class FacebookCampaignSyncService
{
    /**
     * Sync campaign insights từ Facebook cho một account cụ thể hoặc tất cả account.
     *
     * @param  array  $data  Mảng dữ liệu chứa start_date, end_date, và tùy chọn account_id
     * @param  mixed|null  $accountRecord  Nếu truyền vào một record cụ thể thì chỉ sync cho account đó
     */
    public static function sync(array $data, mixed $accountRecord = null, bool $isTest = false): void
    {
        $accountFilters = null;
        if (isset($data['account_id']) && ! empty($data['account_id'])) {
            $query = Account::whereIn('account_id', $data['account_id'])
                ->where('ads_type', AdsType::FACEBOOK->value)
                ->where('status', 'ACTIVE');

            self::applyMainTeamCampaignSyncScope($query);

            $accountFilters = $query->get();
        }

        $accounts = $accountFilters
            ? $accountFilters
            : ($accountRecord
                ? [$accountRecord]
                : self::campaignSyncAccountsQuery(AdsType::FACEBOOK->value)->get());

        $accounts = collect($accounts)
            ->filter(fn ($account) => self::shouldFetchAccount($account))
            ->values();

        $tokenConfigTemps = config('facebook.facebook_sync_tokens');

        if (empty($tokenConfigTemps)) {
            Log::error('[FacebookCampaignSync] Missing facebook_sync_tokens configuration');

            return;
        }

        $appIds = explode(',', $tokenConfigTemps['app_id']);
        $appSecrets = explode(',', $tokenConfigTemps['app_secret']);
        $accessTokens = explode(',', $tokenConfigTemps['access_token']);

        $tokenConfigs = [];
        foreach ($appIds as $index => $appId) {
            $tokenConfigs[] = [
                'app_id' => trim($appId),
                'app_secret' => trim($appSecrets[$index]),
                'access_token' => trim($accessTokens[$index]),
            ];
        }

        if (empty($tokenConfigs)) {
            Log::error('[FacebookCampaignSync] No valid Facebook token configurations found');

            return;
        }

        $accountsArray = $accounts->toArray();
        $batchSize = max(1, (int) ceil(count($accountsArray) / count($tokenConfigs)));
        $accountBatches = array_chunk($accountsArray, $batchSize);

        $jobs = [];
        foreach ($accountBatches as $batchIndex => $accountBatch) {
            $tokenConfigIndex = $batchIndex % count($tokenConfigs);
            $tokenConfig = $tokenConfigs[$tokenConfigIndex];

            $jobs[] = new SyncFacebookCampaignBatchJob(
                accountBatch: $accountBatch,
                tokenConfig: $tokenConfig,
                startDate: $data['start_date'],
                endDate: $data['end_date'],
                batchIndex: $batchIndex,
                tokenConfigIndex: $tokenConfigIndex,
            );
        }

        if (empty($jobs)) {
            return;
        }

        $startDate = $data['start_date'];
        $endDate = $data['end_date'];
        $failedAdClientIds = $data['failed_ad_client_ids'] ?? false;

        Bus::batch($jobs)
            ->name('Facebook Campaign Sync - '.count($jobs).' batches')
            ->allowFailures()
            ->finally(function () use ($startDate, $endDate, $isTest, $failedAdClientIds) {
                if ($isTest) {
                    return;
                }

                try {
                    $resp = CampaignReportSyncService::sync([
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'failed_ad_client_ids' => $failedAdClientIds,
                    ]);

                    if (! ($resp['success'] ?? false)) {
                        Log::error('[FacebookCampaignSync][CampaignReport] Sync failed', [
                            'message' => $resp['message'] ?? null,
                            'synced_count' => $resp['synced_count'] ?? 0,
                            'error_count' => $resp['error_count'] ?? 0,
                        ]);
                    }
                } catch (\Throwable $e) {
                    Log::error('[FacebookCampaignSync][CampaignReport] Throwable', [
                        'error' => $e->getMessage(),
                    ]);
                }

                // Dispatch campaign rule evaluation after reports are synced, today only
                if (Carbon::parse($endDate)->isToday()) {
                    try {
                        self::dispatchCampaignRuleJobs($endDate);
                    } catch (\Throwable $e) {
                        Log::error('[FacebookCampaignSync][CampaignRules] Throwable', [
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            })
            ->onQueue(config('queue.queues.all-reports-sync'))
            ->dispatch();
    }

    private static function dispatchCampaignRuleJobs(string $date): void
    {
        $campaigns = Campaign::query()
            ->whereHas(
                'applyRules.campaignRule',
                fn ($q) => $q
                    ->where('is_active', true)
                    ->where(fn ($q2) => $q2->whereNull('expired_at')->orWhere('expired_at', '>=', now()))
            )
            ->get();

        foreach ($campaigns as $campaign) {
            EvaluateCampaignRuleJob::dispatch($campaign, $date);
        }
    }

    private static function campaignSyncAccountsQuery(string $adsType)
    {
        $query = Account::whereNotNull('account_id')
            ->where('status', 'ACTIVE')
            ->where('ads_type', $adsType);

        self::applyMainTeamCampaignSyncScope($query);

        return $query;
    }

    private static function applyMainTeamCampaignSyncScope($query): void
    {
        if (! config('main_system.is_main')) {
            return;
        }

        $query->where(function ($builder): void {
            $builder->whereNull('main_team_id')
                ->orWhereHas('mainTeam', fn ($mainTeamQuery) => $mainTeamQuery->where('sync_campaign_reports', true));
        });
    }

    private static function shouldFetchAccount(mixed $account): bool
    {
        if (! config('main_system.is_main')) {
            return true;
        }

        if ($account instanceof Account) {
            if (empty($account->main_team_id)) {
                return true;
            }

            $account->loadMissing('mainTeam');

            return (bool) $account->mainTeam?->sync_campaign_reports;
        }

        return empty(data_get($account, 'main_team_id')) || (bool) data_get($account, 'main_team.sync_campaign_reports', false);
    }
}

<?php

namespace App\Services\Integrations\Google;

use App\Enums\AdsType;
use App\Jobs\ApplyCampaignNameToRuleJob;
use App\Models\Account;
use App\Models\Campaign;
use App\Models\InsightReport;
use App\Services\MainSystem\MainSystemSyncService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class GoogleCampaignSyncService
{
    /**
     * Sync campaign insights từ Google cho một account cụ thể hoặc tất cả account.
     *
     * @param  array  $data  Mảng dữ liệu chứa start_date và end_date
     * @param  mixed|null  $accountRecord  Nếu truyền vào một record cụ thể thì chỉ sync cho account đó, ngược lại sync cho tất cả.
     */
    public static function sync(array $data, mixed $accountRecord = null): void
    {
        $accountFilters = null;
        if (isset($data['account_id']) && ! empty($data['account_id'])) {
            $query = Account::whereIn('account_id', $data['account_id'])
                ->where('ads_type', AdsType::GOOGLE->value)
                ->where('status', 'ACTIVE');

            self::applyMainTeamCampaignSyncScope($query);

            $accountFilters = $query->get();
        }

        $accounts = $accountFilters
            ? $accountFilters
            : ($accountRecord
                ? [$accountRecord]
                : self::campaignSyncAccountsQuery(AdsType::GOOGLE->value)->get());

        $accounts = collect($accounts)
            ->filter(fn($account) => self::shouldFetchAccount($account))
            ->values();

        $service = app(GoogleAdsService::class);

        foreach ($accounts as $account) {
            try {
                $response = $service->getCampaignInsights($account->account_id, $data['start_date'], $data['end_date']);

                if (! $response || empty($response['insights'])) {
                    continue;
                }

                $insights = $response['insights'];
                $campaigns = $response['campaigns'];

                $insightsData = DB::transaction(function () use ($insights, $campaigns) {
                    if (! empty($campaigns)) {
                        Campaign::upsert(
                            $campaigns,
                            ['campaign_id'],
                            ['campaign_name', 'daily_budget', 'lifetime_budget', 'status', 'start_time', 'stop_time', 'created_time', 'updated_time', 'created_at', 'updated_at']
                        );

                        $campaignIds = array_column($campaigns, 'campaign_id');
                        if (! empty($campaignIds)) {
                            ApplyCampaignNameToRuleJob::dispatch($campaignIds);
                        }
                    }

                    $insightsData = array_map(function ($insight) {
                        return [
                            'account_id' => $insight['account_id'],
                            'campaign_id' => $insight['campaign_id'],
                            'date_start' => $insight['date_start'],
                            'impressions' => $insight['impressions'],
                            'clicks' => $insight['clicks'],
                            'reach' => $insight['reach'],
                            'ad_clicks' => $insight['fb_clicks'],
                            'cpa' => $insight['cpa'],
                            'search_clicks' => $insight['link_clicks'],
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
                            'updated_at' => now(),
                        ];
                    }, $insights);

                    InsightReport::upsert(
                        $insightsData,
                        ['account_id', 'campaign_id', 'date_start'],
                        ['impressions', 'clicks', 'reach', 'ad_clicks', 'cpa', 'search_clicks', 'ctr_link', 'cpc_link', 'article_views', 'search_views', 'spend', 'cpc', 'cpm', 'ctr', 'frequency', 'spend_type', 'updated_at']
                    );

                    return $insightsData;
                });

                app(MainSystemSyncService::class)->dispatchInsightReports(
                    accounts: [[
                        'account_id' => $account->account_id,
                        'account_name' => $account->account_name,
                        'ads_type' => $account->ads_type,
                        'status' => $account->status,
                        'is_special' => (bool) $account->is_special,
                        'sync_to_mcc' => (bool) $account->sync_to_mcc,
                    ]],
                    campaigns: $campaigns,
                    insights: $insightsData,
                );
            } catch (Throwable $th) {
                Log::error('Error processing Google account ' . $account->account_id . ': ' . $th->getMessage());
                Log::error($th->getTraceAsString());

                continue;
            }
        }
    }

    /**
     * Sync campaign insights từ Google KHÔNG kèm conversion data.
     * Dùng cho schedule chạy thường xuyên (mỗi 5 phút) để giảm số request API.
     */
    public static function syncWithoutConversions(array $data, mixed $accountRecord = null): void
    {
        $accountFilters = null;
        if (isset($data['account_id']) && ! empty($data['account_id'])) {
            $query = Account::whereIn('account_id', $data['account_id'])
                ->where('ads_type', AdsType::GOOGLE->value)
                ->where('status', 'ACTIVE');

            self::applyMainTeamCampaignSyncScope($query);

            $accountFilters = $query->get();
        }

        $accounts = $accountFilters
            ? $accountFilters
            : ($accountRecord
                ? [$accountRecord]
                : self::campaignSyncAccountsQuery(AdsType::GOOGLE->value)->get());

        $accounts = collect($accounts)
            ->filter(fn($account) => self::shouldFetchAccount($account))
            ->values();

        $service = app(GoogleAdsService::class);

        foreach ($accounts as $account) {
            try {
                $response = $service->getCampaignInsightsWithoutConversions($account->account_id, $data['start_date'], $data['end_date']);

                if (! $response || empty($response['insights'])) {
                    continue;
                }

                $insights = $response['insights'];
                $campaigns = $response['campaigns'];

                $insightsData = DB::transaction(function () use ($insights, $campaigns) {
                    if (! empty($campaigns)) {
                        Campaign::upsert(
                            $campaigns,
                            ['campaign_id'],
                            ['campaign_name', 'daily_budget', 'lifetime_budget', 'status', 'start_time', 'stop_time', 'created_time', 'updated_time', 'created_at', 'updated_at']
                        );

                        $campaignIds = array_column($campaigns, 'campaign_id');
                        if (! empty($campaignIds)) {
                            ApplyCampaignNameToRuleJob::dispatch($campaignIds);
                        }
                    }

                    $insightsData = array_map(function ($insight) {
                        return [
                            'account_id' => $insight['account_id'],
                            'campaign_id' => $insight['campaign_id'],
                            'date_start' => $insight['date_start'],
                            'impressions' => $insight['impressions'],
                            'clicks' => $insight['clicks'],
                            'reach' => $insight['reach'],
                            'cpa' => $insight['cpa'],
                            'search_clicks' => $insight['link_clicks'],
                            'ctr_link' => $insight['ctr_link'],
                            'cpc_link' => $insight['cpc_link'],
                            'spend' => $insight['spend'],
                            'cpc' => $insight['cpc'],
                            'cpm' => $insight['cpm'],
                            'ctr' => $insight['ctr'],
                            'frequency' => $insight['frequency'],
                            'spend_type' => $insight['spend_type'],
                            'updated_at' => now(),
                        ];
                    }, $insights);

                    // Không chứa article_views, search_views, ad_clicks → không ghi đè conversion data
                    InsightReport::upsert(
                        $insightsData,
                        ['account_id', 'campaign_id', 'date_start'],
                        ['impressions', 'clicks', 'reach', 'cpa', 'search_clicks', 'ctr_link', 'cpc_link', 'spend', 'cpc', 'cpm', 'ctr', 'frequency', 'spend_type', 'updated_at']
                    );

                    return $insightsData;
                });

                app(MainSystemSyncService::class)->dispatchInsightReports(
                    accounts: [[
                        'account_id' => $account->account_id,
                        'account_name' => $account->account_name,
                        'ads_type' => $account->ads_type,
                        'status' => $account->status,
                        'is_special' => (bool) $account->is_special,
                        'sync_to_mcc' => (bool) $account->sync_to_mcc,
                    ]],
                    campaigns: $campaigns,
                    insights: $insightsData,
                );
            } catch (Throwable $th) {
                Log::error('Error processing Google account (without conversions) ' . $account->account_id . ': ' . $th->getMessage());
                Log::error($th->getTraceAsString());

                continue;
            }
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
                ->orWhereHas('mainTeam', fn($mainTeamQuery) => $mainTeamQuery->where('sync_campaign_reports', true));
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

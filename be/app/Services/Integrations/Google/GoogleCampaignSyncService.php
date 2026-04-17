<?php

namespace App\Services\Integrations\Google;

use App\Enums\AdsType;
use App\Models\Account;
use App\Models\Campaign;
use App\Models\InsightReport;
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
            $accountFilters = Account::whereIn('account_id', $data['account_id'])
                ->where('ads_type', AdsType::GOOGLE->value)
                ->where('status', 'ACTIVE')
                ->get();
        }

        $accounts = $accountFilters
            ? $accountFilters
            : ($accountRecord
                ? [$accountRecord]
                : Account::whereNotNull('account_id')
                ->where('status', 'ACTIVE')
                ->where('ads_type', AdsType::GOOGLE->value)
                ->get());

        $service = app(GoogleAdsService::class);

        foreach ($accounts as $account) {
            try {
                $response = $service->getCampaignInsights($account->account_id, $data['start_date'], $data['end_date']);

                if (! $response || empty($response['insights'])) {
                    continue;
                }

                $insights = $response['insights'];
                $campaigns = $response['campaigns'];

                DB::transaction(function () use ($insights, $campaigns) {
                    if (! empty($campaigns)) {
                        Campaign::upsert(
                            $campaigns,
                            ['campaign_id'],
                            ['campaign_name', 'daily_budget', 'lifetime_budget', 'status', 'start_time', 'stop_time', 'updated_at']
                        );
                        // TODO: Campaign rule name
                        // $campaignIds = array_column($campaigns, 'campaign_id');
                        // if (!empty($campaignIds)) {
                        //     ApplyCampaignNameToRuleJob::dispatch($campaignIds);
                        // }
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

                    // TODO: 
                    // if (config('define.fetch') != true) {
                    //     self::pushToMaster($insightsData, $campaigns);
                    //     self::pushStylesToMaster($campaigns);
                    // }
                });
            } catch (Throwable $th) {
                Log::error('Error processing Google account ' . $account->account_id . ': ' . $th->getMessage());
                Log::error($th->getTraceAsString());

                continue;
            }
        }
    }

    // TODO:
    // /**
    //  * Push insights data to Master Server.
    //  */
    // private static function pushToMaster(array $insightsData, array $campaigns): void
    // {
    //     $masterUrl = config('services.master.url');
    //     $apiKey = config('services.master.api_key');

    //     if (empty($masterUrl) || empty($apiKey)) {
    //         Log::warning('Master Server configuration missing. Skipping push.');
    //         return;
    //     }

    //     try {
    //         $insightConvert = ['created_at', 'updated_at'];
    //         foreach ($insightsData as $key => $value) {
    //             foreach ($insightConvert as $convert) {
    //                 if (isset($value[$convert])) {
    //                     $insightsData[$key][$convert] = \Carbon\Carbon::parse($value[$convert])->toDateTimeString();
    //                 }
    //             }
    //         }
    //         $campaignConvert = ['created_at', 'updated_at', 'created_time', 'updated_time', 'start_time', 'stop_time'];
    //         foreach ($campaigns as $key => $value) {
    //             foreach ($campaignConvert as $convert) {
    //                 if (isset($value[$convert])) {
    //                     $campaigns[$key][$convert] = \Carbon\Carbon::parse($value[$convert])->toDateTimeString();
    //                 }
    //             }
    //         }

    //         $response = \Illuminate\Support\Facades\Http::withHeaders([
    //             'X-Master-Key' => $apiKey,
    //             'Accept' => 'application/json',
    //         ])->post($masterUrl . '/api/webhook/receive-insights', [
    //             'insights' => $insightsData,
    //             'campaigns' => $campaigns,
    //         ]);

    //         if (! $response->successful()) {
    //             Log::error('Failed to push Google insights to Master Server', [
    //                 'status' => $response->status(),
    //                 'body' => $response->body(),
    //             ]);
    //         }
    //     } catch (Throwable $e) {
    //         Log::error('Exception pushing Google insights to Master Server', [
    //             'error' => $e->getMessage(),
    //         ]);
    //     }
    // }

    // /**
    //  * Push styles data to Master Server.
    //  */
    // private static function pushStylesToMaster(array $campaigns): void
    // {
    //     $masterUrl = config('services.master.url');
    //     $apiKey = config('services.master.api_key');

    //     if (empty($masterUrl) || empty($apiKey)) {
    //         return;
    //     }

    //     try {
    //         $campaignIds = array_column($campaigns, 'campaign_id');

    //         $styleCodes = LinkData::whereIn('campaign_id', $campaignIds)
    //             ->distinct()
    //             ->pluck('style_code')
    //             ->filter()
    //             ->values()
    //             ->toArray();

    //         if (empty($styleCodes)) {
    //             return;
    //         }

    //         $styles = Style::whereIn('code', $styleCodes)
    //             ->whereNotNull('traffic_source')
    //             ->get(['code', 'traffic_source'])
    //             ->map(fn($style) => [
    //                 'code' => $style->code,
    //                 'traffic_source' => $style->traffic_source,
    //             ])
    //             ->toArray();

    //         if (empty($styles)) {
    //             return;
    //         }

    //         $response = Http::withHeaders([
    //             'X-Master-Key' => $apiKey,
    //             'Accept' => 'application/json',
    //         ])->post($masterUrl . '/api/webhook/receive-styles', [
    //             'styles' => $styles,
    //         ]);

    //         if (! $response->successful()) {
    //             Log::error('Failed to push Google styles to Master Server', [
    //                 'status' => $response->status(),
    //                 'body' => $response->body(),
    //             ]);
    //         }
    //     } catch (Throwable $e) {
    //         Log::error('Exception pushing Google styles to Master Server', [
    //             'error' => $e->getMessage(),
    //         ]);
    //     }
    // }
}

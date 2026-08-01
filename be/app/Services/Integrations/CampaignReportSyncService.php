<?php

namespace App\Services\Integrations;

use App\Enums\AdsType;
use App\Jobs\SendTelegramWarningJob;
use App\Models\Campaign;
use App\Models\CampaignReport;
use App\Models\InsightReport;
use App\Models\LinkData;
use App\Models\RealtimeReport;
use App\Models\RevenueReport;
use App\Services\Integrations\Ads\AdsStatusService;
use App\Support\MainTeam\MainTeamReportDataScope;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

class CampaignReportSyncService
{
    private const MIN_SPEND_TRASH_CAMPAIGN = 5;

    /**
     * @var array<int, array{min_clicks: int, max_clicks: int, max_cvr: float, min_ctr: float}>
     */
    private const CTR_ALERT_TIERS = [
        ['min_clicks' => 20, 'max_clicks' => 50, 'max_cvr' => 0.55, 'min_ctr' => 0.85],
        ['min_clicks' => 50, 'max_clicks' => 150, 'max_cvr' => 0.60, 'min_ctr' => 0.80],
        ['min_clicks' => 150, 'max_clicks' => 300, 'max_cvr' => 0.65, 'min_ctr' => 0.75],
    ];

    private const HIGH_CTR_AUTO_PAUSE_MIN_CLICKS = 15;

    private const HIGH_CTR_AUTO_PAUSE_MIN_CTR = 0.85;

    private const HIGH_CTR_AUTO_PAUSE_CACHE_TTL = 86_400;

    private const CTR_ALERT_CACHE_TTL = 172_800;

    private const TRASH_CAMPAIGN_ALERT_CACHE_TTL = 86_400;

    /**
     * Sync and aggregate data from InsightReport + RevenueReport into CampaignReport table.
     */
    public static function sync(array $options = []): array
    {
        $startDate = $options['start_date'] ?? Carbon::now()->subDay()->toDateString();
        $endDate = $options['end_date'] ?? Carbon::now()->toDateString();

        $logger = Log::channel('sync_reports');
        $syncedCount = 0;
        $errorCount = 0;

        try {
            $currentDate = Carbon::parse($startDate);
            $endDateCarbon = Carbon::parse($endDate);

            while ($currentDate <= $endDateCarbon) {
                $dateString = $currentDate->toDateString();

                try {
                    $result = self::syncDateData($dateString);

                    $syncedCount += $result['synced_count'];
                    $errorCount += $result['error_count'];
                } catch (Exception $e) {
                    $errorCount++;
                    $logger->error('[CampaignReportSync] Date processing failed', [
                        'date' => $dateString,
                        'error' => $e->getMessage(),
                    ]);
                }

                $currentDate->addDay();
            }

            return [
                'success' => true,
                'synced_count' => $syncedCount,
                'error_count' => $errorCount,
                'message' => "Successfully synced {$syncedCount} records with {$errorCount} errors",
            ];
        } catch (Exception $e) {
            $logger->error('[CampaignReportSync] Fatal error', [
                'error' => $e->getMessage(),
                'stack_trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'synced_count' => $syncedCount,
                'error_count' => $errorCount + 1,
                'message' => 'Sync failed: '.$e->getMessage(),
            ];
        }
    }

    private static function syncDateData(string $date): array
    {
        $syncedCount = 0;

        try {
            DB::transaction(function () use ($date, &$syncedCount) {

                $insightReportsQuery = InsightReport::with(['campaign', 'campaign.account'])
                    ->whereDate('date_start', $date);

                self::applyMainTeamInsightScope($insightReportsQuery);

                $insightReports = $insightReportsQuery->get();

                foreach ($insightReports as $insightReport) {
                    try {
                        $reportData = self::buildReportData($date, $insightReport);

                        if ($reportData === null) {
                            continue;
                        }

                        if (! Carbon::parse($date)->isToday()) {
                            unset($reportData['owner_user_id']);
                        }

                        CampaignReport::updateOrCreate(
                            [
                                'date_start' => $date,
                                'campaign_id' => $insightReport->campaign_id,
                            ],
                            $reportData
                        );

                        $syncedCount++;
                    } catch (Exception $e) {
                        Log::channel('sync_reports')->warning('[CampaignReportSync] Failed to create report record', [
                            'date' => $date,
                            'campaign_id' => $insightReport->campaign_id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });

            return [
                'synced_count' => $syncedCount,
                'error_count' => 0,
            ];
        } catch (Exception $e) {
            Log::channel('sync_reports')->error('[CampaignReportSync] Date sync failed', [
                'date' => $date,
                'error' => $e->getMessage(),
                'stack_trace' => $e->getTraceAsString(),
            ]);

            return [
                'synced_count' => 0,
                'error_count' => 1,
            ];
        }
    }

    private static function applyMainTeamInsightScope($query): void
    {
        if (! config('main_system.is_main')) {
            return;
        }

        $query->whereHas('campaign', function ($campaignQuery): void {
            MainTeamReportDataScope::excludeNonFetchableAccounts(
                $campaignQuery,
                'campaigns.account_id',
                adsTypeColumn: 'campaigns.ads_type',
            );
        });
    }

    private static function buildReportData(string $date, InsightReport $insightReport): ?array
    {
        $linkData = LinkData::where('campaign_id', $insightReport->campaign_id)->first();

        $data = [];
        $spend = (float) ($insightReport->spend ?? 0);
        $campaign = $insightReport->campaign;
        $account = $campaign?->account;
        if ($linkData) {
            $realtimeReport = RealtimeReport::where('link_data_id', $linkData->id)
                ->whereDate('event_time', $date)
                ->first();
            $revenueData = self::getRevenueData($date, $linkData->channel_code);
            $rConversion = (int) ($revenueData['clicks'] ?? 0);
            $sumRealtimeClickAdCount = self::sumRealtimeClickAdCount($date, $linkData->channel_code);
            $rCpa = $rConversion > 0 ? $spend / $rConversion : 0;
            $estimatedEarnings = (float) ($revenueData['estimated_earnings'] ?? 0);
            $costPerClick = isset($revenueData['cost_per_click']) && $revenueData['cost_per_click'] !== null
                ? (float) $revenueData['cost_per_click']
                : null;
            if ($costPerClick === null || $costPerClick <= 0) {
                $realtimeClicks = $rConversion > 0
                    ? $rConversion
                    : $sumRealtimeClickAdCount;
                $costPerClick = $realtimeClicks > 0 ? $estimatedEarnings / $realtimeClicks : 0;
            }

            self::sendHighCtrAlertIfNeeded(
                date: $date,
                linkData: $linkData,
                insightReport: $insightReport,
                realtimeReport: $realtimeReport,
                rConversion: $rConversion,
                sumRealtimeClickAdCount: $sumRealtimeClickAdCount,
            );

            $data = [
                'realtime_report_id' => $realtimeReport?->id,
                // Style/Channel info
                'style_code' => $linkData->style_code,
                'channel_code' => $linkData->channel_code,
                'channel_name' => $revenueData['channel_name'] ?? $linkData->channel_code,
                // Revenue fields (r_*) from RevenueReport
                'r_search_views' => (int) ($revenueData['page_views'] ?? 0),
                'r_conversion' => $rConversion,
                'r_revenue' => $estimatedEarnings,
                'r_rpc' => $costPerClick,
                'r_ad_requests' => (int) ($revenueData['ad_requests'] ?? 0),
                'r_ad_requests_rpm' => (float) ($revenueData['ad_requests_rpm'] ?? 0),
                'r_impressions' => (int) ($revenueData['impressions'] ?? 0),
                'r_impressions_rpm' => (float) ($revenueData['impressions_rpm'] ?? 0),
                'r_funnel_requests' => (int) ($revenueData['funnel_requests'] ?? 0),
                'r_funnel_clicks' => (int) ($revenueData['funnel_clicks'] ?? 0),
                'r_funnel_impressions' => (int) ($revenueData['funnel_impressions'] ?? 0),
                'r_funnel_rpm' => (float) ($revenueData['funnel_rpm'] ?? 0),
                'r_cpa' => $rCpa,
            ];
        } elseif ($spend > self::MIN_SPEND_TRASH_CAMPAIGN) {
            $cacheKey = self::trashCampaignAlertCacheKey($date, (int) $insightReport->campaign_id);

            if (! Redis::get($cacheKey)) {
                $message = self::buildAlertMessageTrashCampaign($campaign, $date);
                SendTelegramWarningJob::dispatch(message: $message, campaignId: (string) $insightReport->campaign_id, adsLinkId: (string) Str::uuid());
                Redis::setex($cacheKey, self::TRASH_CAMPAIGN_ALERT_CACHE_TTL, 1);
            }
        }

        return [
            ...$data,
            'date_start' => $date,

            // Campaign info
            'account_id' => $insightReport->account_id,
            'owner_user_id' => $insightReport->owner_user_id,
            'account_name' => $account?->account_name,
            'campaign_id' => $insightReport->campaign_id,
            'campaign_name' => $campaign?->campaign_name,
            'campaign_status' => $campaign?->status,
            'ads_type' => $campaign?->ads_type,
            'daily_budget' => $campaign?->daily_budget ?? 0,
            'lifetime_budget' => $campaign?->lifetime_budget ?? 0,
            'target_cpa' => $campaign?->target_cpa ?? 0,
            'bidding_strategy_type' => $campaign?->bidding_strategy_type,

            // Ads spend fields (a_*) from InsightReport
            'a_ad_clicks' => (int) ($insightReport->ad_clicks ?? 0),
            'a_article_views' => (int) ($insightReport->article_views ?? 0),
            'a_search_views' => (int) ($insightReport->search_views ?? 0),
            'a_conversion' => (int) ($insightReport->search_clicks ?? 0),
            'a_spend' => $spend,
            'a_impressions' => (int) ($insightReport->impressions ?? 0),
            'a_cpc' => (float) ($insightReport->cpc ?? 0),
            'a_cpm' => (float) ($insightReport->cpm ?? 0),
            'a_ctr' => (float) ($insightReport->ctr ?? 0),
            'a_reach' => (int) ($insightReport->reach ?? 0),
            'a_cpa' => (float) ($insightReport->cpa ?? 0),
            'a_ctr_link' => (float) ($insightReport->ctr_link ?? 0),
            'a_cpc_link' => (float) ($insightReport->cpc_link ?? 0),
            'a_frequency' => (float) ($insightReport->frequency ?? 0),
            'a_clicks' => (int) ($insightReport->clicks ?? 0),
        ];
    }

    private static function sendHighCtrAlertIfNeeded(
        string $date,
        LinkData $linkData,
        InsightReport $insightReport,
        ?RealtimeReport $realtimeReport,
        int $rConversion,
        int $sumRealtimeClickAdCount,
    ): void {
        if ($insightReport->campaign?->ads_type == AdsType::GOOGLE->value) {
            return;
        }

        if (! Carbon::parse($date)->isToday()) {
            return;
        }

        $realtimeClickAdCount = (int) ($realtimeReport->click_ad_count ?? 0);
        $tier = self::matchAlertTier($realtimeClickAdCount);

        if (! $tier || ! $realtimeReport) {
            return;
        }

        $viewSearch = (int) ($realtimeReport->view_search_count ?? 0);

        if ($viewSearch <= 0) {
            return;
        }

        $ctr = $realtimeClickAdCount / $viewSearch;
        $cvr = $rConversion / $sumRealtimeClickAdCount;

        if ($cvr >= $tier['max_cvr'] || $ctr <= $tier['min_ctr']) {
            return;
        }

        $alertTierKey = self::alertTierKey($tier);
        $cacheKey = self::highCtrAlertCacheKey($date, (int) $linkData->id);
        $alreadyAlerted = Redis::get($cacheKey) === $alertTierKey;

        $linkData->loadMissing('adsLink.site', 'adsLink.creator.campaignRuleSetting');

        $campaign = $insightReport->campaign;
        $campaignId = $insightReport->campaign_id ?? 'N/A';
        $campaignName = $campaign?->campaign_name ?? 'N/A';
        $adsLinkUrl = self::adsLinkUrl($linkData);
        $owner = $linkData->adsLink?->creator;
        $ownerName = $owner?->name ?? 'N/A';
        $telegramChatId = $owner?->campaignRuleSetting?->telegram_chat_id;

        if (! $alreadyAlerted) {
            $ctrPercent = round($ctr * 100, 2);
            $cvrPercent = round($cvr * 100, 2);

            $message = "⚠️ *High CTR Alert*\n\n"
                ."Campaign ID: `{$campaignId}`\n"
                ."Campaign Name: *{$campaignName}*\n"
                ."Ads Link: {$adsLinkUrl}\n"
                ."Owner: *{$ownerName}*\n"
                ."View Search: *{$viewSearch}*\n"
                ."Click Ad: *{$realtimeClickAdCount}*\n"
                ."Channel Click Ad: *{$sumRealtimeClickAdCount}*\n"
                ."CTR: *{$ctrPercent}%*\n"
                ."Conversion: *{$rConversion}*\n"
                ."CVR: *{$cvrPercent}%*";

            SendTelegramWarningJob::dispatch(
                message: $message,
                campaignId: (string) $campaignId,
                adsLinkId: (string) ($linkData->ads_link_id ?? ''),
                chatIdOverride: $telegramChatId,
            );

            Redis::setex($cacheKey, self::CTR_ALERT_CACHE_TTL, $alertTierKey);
        }

        self::autoPauseHighCtrCampaignIfNeeded(
            linkData: $linkData,
            insightReport: $insightReport,
            telegramChatId: $telegramChatId,
            ownerName: $ownerName,
            adsLinkUrl: $adsLinkUrl,
            clickAdCount: $realtimeClickAdCount,
            ctr: $ctr,
        );
    }

    private static function autoPauseHighCtrCampaignIfNeeded(
        LinkData $linkData,
        InsightReport $insightReport,
        ?string $telegramChatId,
        string $ownerName,
        string $adsLinkUrl,
        int $clickAdCount,
        float $ctr,
    ): void {
        if ($clickAdCount <= self::HIGH_CTR_AUTO_PAUSE_MIN_CLICKS) {
            return;
        }

        if ($ctr <= self::HIGH_CTR_AUTO_PAUSE_MIN_CTR) {
            return;
        }

        $campaignId = (string) ($insightReport->campaign_id ?? '');

        if ($campaignId === '') {
            return;
        }

        $campaign = $insightReport->campaign;

        if ($campaign?->status === 'PAUSED') {
            return;
        }

        $cacheKey = "campaign_report:high_ctr_auto_pause:{$campaignId}";

        if (Redis::get($cacheKey)) {
            return;
        }

        try {
            app(AdsStatusService::class)->updateCampaignStatus($campaignId, 'PAUSED');

            Campaign::where('campaign_id', $campaignId)->update(['status' => 'PAUSED']);
            CampaignReport::where('campaign_id', $campaignId)->update(['campaign_status' => 'PAUSED']);

            Redis::setex($cacheKey, self::HIGH_CTR_AUTO_PAUSE_CACHE_TTL, 1);

            $ctrPercent = round($ctr * 100, 2);
            $campaignName = $campaign?->campaign_name ?? 'N/A';

            $message = "🛑 *Campaign Auto-Paused*\n\n"
                ."Campaign ID: `{$campaignId}`\n"
                ."Campaign Name: *{$campaignName}*\n"
                ."Ads Link: {$adsLinkUrl}\n"
                ."Owner: *{$ownerName}*\n"
                ."CTR (15m): *{$ctrPercent}%* (> ".round(self::HIGH_CTR_AUTO_PAUSE_MIN_CTR * 100)."%) \n"
                ."Click Ad (15m): *{$clickAdCount}* (> ".self::HIGH_CTR_AUTO_PAUSE_MIN_CLICKS.')';

            SendTelegramWarningJob::dispatch(
                message: $message,
                campaignId: $campaignId,
                adsLinkId: (string) ($linkData->ads_link_id ?? ''),
                chatIdOverride: $telegramChatId,
            );
        } catch (\Throwable $e) {
            Log::error('[CampaignReportSync] Failed to auto-pause high CTR campaign', [
                'campaign_id' => $campaignId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * @param  array{min_clicks: int, max_clicks: int, max_cvr: float, min_ctr: float}  $tier
     */
    private static function alertTierKey(array $tier): string
    {
        return $tier['min_clicks'].'-'.$tier['max_clicks'];
    }

    private static function highCtrAlertCacheKey(string $date, int $linkDataId): string
    {
        return "campaign_report:high_ctr_alert:{$date}:link_data:{$linkDataId}:tier";
    }

    private static function trashCampaignAlertCacheKey(string $date, int $campaignId): string
    {
        return "campaign_report:trash_campaign_alert:{$date}:campaign:{$campaignId}";
    }

    private static function adsLinkUrl(LinkData $linkData): string
    {
        $adsLink = $linkData->adsLink;

        if (! $adsLink?->slug) {
            return 'N/A';
        }

        $siteUrl = rtrim((string) ($adsLink->site?->url ?? ''), '/');

        return $siteUrl !== ''
            ? "{$siteUrl}/articles/{$adsLink->slug}?tracking_code={$adsLink->tracking_code}"
            : $adsLink->slug;
    }

    /**
     * @return array{min_clicks: int, max_clicks: int, max_cvr: float, min_ctr: float}|null
     */
    private static function matchAlertTier(int $clickAd): ?array
    {
        foreach (self::CTR_ALERT_TIERS as $tier) {
            if ($clickAd >= $tier['min_clicks'] && $clickAd < $tier['max_clicks']) {
                return $tier;
            }
        }

        return null;
    }

    /**
     * Sum click_ad_count from RealtimeReports whose LinkData share the same channel_code on a given date.
     */
    private static function sumRealtimeClickAdCount(string $date, string $channelCode): int
    {
        return (int) RealtimeReport::whereDate('event_time', $date)
            ->whereIn('link_data_id', function ($q) use ($channelCode) {
                $q->select('id')
                    ->from('link_datas')
                    ->where('channel_code', $channelCode);
            })
            ->sum('click_ad_count');
    }

    /**
     * Get aggregated RevenueReport data for a specific channel on a date.
     */
    private static function getRevenueData(string $date, string $channelCode): array
    {
        $report = RevenueReport::where('date', $date)
            ->where('channel_code', $channelCode)
            ->selectRaw('
                SUM(estimated_earnings) as estimated_earnings,
                SUM(clicks) as clicks,
                SUM(page_views) as page_views,
                SUM(ad_requests) as ad_requests,
                SUM(impressions) as impressions,
                AVG(ad_requests_rpm) as ad_requests_rpm,
                AVG(impressions_rpm) as impressions_rpm,
                AVG(cost_per_click) as cost_per_click,
                SUM(funnel_requests) as funnel_requests,
                SUM(funnel_clicks) as funnel_clicks,
                SUM(funnel_impressions) as funnel_impressions,
                AVG(funnel_rpm) as funnel_rpm
            ')
            ->first();

        return $report ? $report->toArray() : [];
    }

    /**
     * @param  Collection<int, Campaign>  $campaigns
     */
    private static function buildAlertMessageTrashCampaign(Campaign $campaign, ?string $date): string
    {
        $message = "⚠️ *Cảnh báo: Campaign không có Report*\n\n";
        $message .= '🕐 *Thời gian:* '.now()->format('Y-m-d H:i:s')."\n";
        $message .= '📅 *Ngày kiểm tra:* '.($date ?? 'Tất cả')."\n";

        $accountName = $campaign->account?->account_name ?? 'N/A';
        $fullAccountName = $accountName.' ('.$campaign->account_id.')';
        $safeAccountName = str_replace('_', '\_', $fullAccountName);

        $message .= "*🏦 Account:* {$safeAccountName}\n";
        $message .= "*🏷 Campaign:* {$campaign->campaign_name}\n";
        $message .= "*🆔 Campaign ID:* {$campaign->campaign_id}\n";
        $message .= "➖➖➖➖➖➖➖➖➖➖\n\n";

        return $message;
    }
}

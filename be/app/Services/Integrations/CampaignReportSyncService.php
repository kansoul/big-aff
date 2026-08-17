<?php

namespace App\Services\Integrations;

use App\Enums\AdsType;
use App\Jobs\SendTelegramWarningJob;
use App\Models\Campaign;
use App\Models\CampaignReport;
use App\Models\InsightReport;
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
        $data = [];
        $spend = (float) ($insightReport->spend ?? 0);
        $campaign = $insightReport->campaign;
        $account = $campaign?->account;
        $revenueData = RevenueReport::query()
            ->where('campaign_id', $insightReport->campaign_id)
            ->whereDate('created_at', $date)
            ->selectRaw('
                COALESCE(SUM(page_views), 0) AS search_views,
                COALESCE(SUM(clicks), 0) AS conversions,
                COALESCE(SUM(estimate_earning), 0) AS revenue,
                COALESCE(SUM(ad_requests), 0) AS ad_requests,
                COALESCE(SUM(impressions), 0) AS impressions,
                COALESCE(SUM(funnel_requests), 0) AS funnel_requests,
                COALESCE(SUM(funnel_clicks), 0) AS funnel_clicks,
                COALESCE(SUM(funnel_impressions), 0) AS funnel_impressions
            ')
            ->first();
        $revenue = (float) ($revenueData->revenue ?? 0);
        $conversions = (int) ($revenueData->conversions ?? 0);
        $adRequests = (int) ($revenueData->ad_requests ?? 0);
        $impressions = (int) ($revenueData->impressions ?? 0);
        $funnelImpressions = (int) ($revenueData->funnel_impressions ?? 0);
        $data = [
            'r_search_views' => (int) ($revenueData->search_views ?? 0),
            'r_conversion' => $conversions,
            'r_revenue' => $revenue,
            'r_rpc' => $conversions > 0 ? $revenue / $conversions : 0,
            'r_ad_requests' => $adRequests,
            'r_ad_requests_rpm' => $adRequests > 0 ? $revenue / $adRequests * 1000 : 0,
            'r_impressions' => $impressions,
            'r_impressions_rpm' => $impressions > 0 ? $revenue / $impressions * 1000 : 0,
            'r_funnel_requests' => (int) ($revenueData->funnel_requests ?? 0),
            'r_funnel_clicks' => (int) ($revenueData->funnel_clicks ?? 0),
            'r_funnel_impressions' => $funnelImpressions,
            'r_funnel_rpm' => $funnelImpressions > 0 ? $revenue / $funnelImpressions * 1000 : 0,
            'r_cpa' => $conversions > 0 ? $spend / $conversions : 0,
        ];
        $realtimeReport = RealtimeReport::where('campaign_id', $insightReport->campaign_id)
            ->whereDate('event_time', $date)
            ->first();
        if ($realtimeReport) {
            $sumRealtimeLeadCount = self::sumRealtimeLeadCount($date);

            if ($campaign) {
                self::sendHighCtrAlertIfNeeded(
                    date: $date,
                    campaign: $campaign,
                    insightReport: $insightReport,
                    realtimeReport: $realtimeReport,
                    rConversion: $conversions,
                    sumRealtimeLeadCount: $sumRealtimeLeadCount,
                );
            }

            $data = [
                ...$data,
                'realtime_report_id' => $realtimeReport?->id,
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
        ];
    }

    private static function sendHighCtrAlertIfNeeded(
        string $date,
        Campaign $campaign,
        InsightReport $insightReport,
        ?RealtimeReport $realtimeReport,
        int $rConversion,
        int $sumRealtimeLeadCount,
    ): void {
        if ($insightReport->campaign?->ads_type == AdsType::GOOGLE->value) {
            return;
        }

        if (! Carbon::parse($date)->isToday()) {
            return;
        }

        $realtimeLeadCount = (int) ($realtimeReport->lead_count ?? 0);
        $tier = self::matchAlertTier($realtimeLeadCount);

        if (! $tier || ! $realtimeReport) {
            return;
        }

        $viewCount = (int) ($realtimeReport->view_count ?? 0);

        if ($viewCount <= 0) {
            return;
        }

        $ctr = $realtimeLeadCount / $viewCount;
        $cvr = $sumRealtimeLeadCount > 0 ? $rConversion / $sumRealtimeLeadCount : 0.0;

        if ($cvr >= $tier['max_cvr'] || $ctr <= $tier['min_ctr']) {
            return;
        }

        $alertTierKey = self::alertTierKey($tier);
        $cacheKey = self::highCtrAlertCacheKey($date, (string) $campaign->campaign_id);
        $alreadyAlerted = Redis::get($cacheKey) === $alertTierKey;

        $campaign->loadMissing('adsLink.site', 'adsLink.creator.campaignRuleSetting');

        $campaignId = $insightReport->campaign_id ?? 'N/A';
        $campaignName = $campaign->campaign_name ?? 'N/A';
        $adsLinkUrl = self::adsLinkUrl($campaign);
        $owner = $campaign->adsLink?->creator;
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
                ."View: *{$viewCount}*\n"
                ."Lead: *{$realtimeLeadCount}*\n"
                ."Channel Lead: *{$sumRealtimeLeadCount}*\n"
                ."CTR: *{$ctrPercent}%*\n"
                ."Conversion: *{$rConversion}*\n"
                ."CVR: *{$cvrPercent}%*";

            SendTelegramWarningJob::dispatch(
                message: $message,
                campaignId: (string) $campaignId,
                adsLinkId: (string) ($campaign->ads_link_id ?? ''),
                chatIdOverride: $telegramChatId,
            );

            Redis::setex($cacheKey, self::CTR_ALERT_CACHE_TTL, $alertTierKey);
        }

        self::autoPauseHighCtrCampaignIfNeeded(
            campaign: $campaign,
            insightReport: $insightReport,
            telegramChatId: $telegramChatId,
            ownerName: $ownerName,
            adsLinkUrl: $adsLinkUrl,
            leadCount: $realtimeLeadCount,
            ctr: $ctr,
        );
    }

    private static function autoPauseHighCtrCampaignIfNeeded(
        Campaign $campaign,
        InsightReport $insightReport,
        ?string $telegramChatId,
        string $ownerName,
        string $adsLinkUrl,
        int $leadCount,
        float $ctr,
    ): void {
        if ($leadCount <= self::HIGH_CTR_AUTO_PAUSE_MIN_CLICKS) {
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
                ."Lead (15m): *{$leadCount}* (> ".self::HIGH_CTR_AUTO_PAUSE_MIN_CLICKS.')';

            SendTelegramWarningJob::dispatch(
                message: $message,
                campaignId: $campaignId,
                adsLinkId: (string) ($campaign->ads_link_id ?? ''),
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

    private static function highCtrAlertCacheKey(string $date, string $campaignId): string
    {
        return "campaign_report:high_ctr_alert:{$date}:campaign:{$campaignId}:tier";
    }

    private static function trashCampaignAlertCacheKey(string $date, int $campaignId): string
    {
        return "campaign_report:trash_campaign_alert:{$date}:campaign:{$campaignId}";
    }

    private static function adsLinkUrl(Campaign $campaign): string
    {
        $adsLink = $campaign->adsLink;

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
     * Sum lead_count from realtime reports for the given date.
     */
    private static function sumRealtimeLeadCount(string $date): int
    {
        return (int) RealtimeReport::whereDate('event_time', $date)
            ->sum('lead_count');
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

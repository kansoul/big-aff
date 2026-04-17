<?php

namespace App\Services\Integrations;

use App\Models\CampaignReport;
use App\Models\InsightReport;
use App\Models\LinkData;
use App\Models\RealtimeReport;
use App\Models\RevenueReport;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CampaignReportSyncService
{
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
                    $failedAdClientIds = $options['failed_ad_client_ids'] ?? false;
                    $result = self::syncDateData($dateString, $failedAdClientIds);

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

    private static function syncDateData(string $date, bool $failedAdClientIds): array
    {
        $syncedCount = 0;

        try {
            DB::transaction(function () use ($date, &$syncedCount, $failedAdClientIds) {
                $insightReports = InsightReport::with(['campaign', 'campaign.account'])
                    ->whereDate('date_start', $date)
                    ->get();

                foreach ($insightReports as $insightReport) {
                    try {
                        $reportData = self::buildReportData($date, $insightReport, $failedAdClientIds);

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

    private static function buildReportData(string $date, InsightReport $insightReport, bool $failedAdClientIds): array
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
            $revenueData = $failedAdClientIds ? [] : self::getRevenueData($date, $linkData->style_code, $linkData->channel_code);
            $rConversion = (int) ($revenueData['clicks'] ?? 0);
            $rCpa = $rConversion > 0 ? $spend / $rConversion : 0;
            $data = [
                'realtime_report_id' => $realtimeReport?->id,
                // Style/Channel info
                'style_code' => $linkData->style_code,
                'channel_code' => $linkData->channel_code,
                // Revenue fields (r_*) from RevenueReport
                'r_search_views' => (int) ($revenueData['page_views'] ?? 0),
                'r_conversion' => $rConversion,
                'r_revenue' => (float) ($revenueData['estimated_earnings'] ?? 0),
                'r_rpc' => (float) ($revenueData['cost_per_click'] ?? 0),
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
        }

        return [
            ...$data,
            'date_start' => $date,

            // Campaign info
            'account_id' => $insightReport->account_id,
            'account_name' => $account?->account_name,
            'campaign_id' => $insightReport->campaign_id,
            'campaign_name' => $campaign?->campaign_name,
            'campaign_status' => $campaign?->status,
            'ads_type' => $campaign?->ads_type,
            'daily_budget' => $campaign?->daily_budget ?? 0,
            'lifetime_budget' => $campaign?->lifetime_budget ?? 0,

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

    /**
     * Get aggregated RevenueReport data for a specific style and channel on a date.
     */
    private static function getRevenueData(string $date, string $styleCode, string $channelCode): array
    {
        $report = RevenueReport::where('date', $date)
            ->where('style_code', $styleCode)
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
}

<?php

namespace App\Services\Integrations\Adx;

use App\Models\AdxCampaign;
use App\Models\AdxLinkData;
use App\Models\AdxRevenueReport;
use App\Services\Integrations\Adsense\GamAdManagerReportService;
use Illuminate\Support\Facades\Log;
use Throwable;

class AdxRevenueSyncService
{
    public function sync(string $startDate, string $endDate): int
    {
        $campaignIds = AdxCampaign::query()
            ->whereNotNull('gam_custom_value_id')
            ->whereNotNull('gam_custom_value')
            ->pluck('gam_custom_value')
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (empty($campaignIds)) {
            Log::channel('sync_reports')->info('[AdxRevenueSync] Skipped GAM fetch because no verified campaign targeting values exist.', [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]);

            return 0;
        }

        try {
            $report = app(GamAdManagerReportService::class)->fetchAdxRevenueByCustomTargeting([
                'date_from' => $startDate,
                'date_to' => $endDate,
                'gam_custom_key' => 'campid',
                'custom_targeting_values' => $campaignIds,
                'currency' => 'USD',
            ]);
        } catch (Throwable $e) {
            Log::channel('sync_reports')->error('[AdxRevenueSync] GAM fetch failed', [
                'start_date' => $startDate,
                'end_date' => $endDate,
                'error' => $e->getMessage(),
            ]);

            return 0;
        }

        $synced = 0;
        $now = now();
        $networkCode = $report['network_code'] ?? null;
        $currency = strtoupper($report['currency'] ?? 'USD');

        foreach (($report['rows'] ?? []) as $row) {
            $dimensions = $row['dimensions'] ?? [];
            $campaignId = (string) ($row['campaign_id'] ?? '');
            $date = $dimensions['date_pt'] ?? null;

            if ($campaignId === '' || $date === null) {
                continue;
            }

            $linkData = AdxLinkData::query()
                ->where('campaign_id', $campaignId)
                ->orderByDesc('last_seen_at')
                ->first();

            AdxRevenueReport::query()->updateOrCreate(
                [
                    'date' => $date,
                    'gam_custom_key' => $row['gam_custom_key'],
                    'gam_custom_value' => $row['gam_custom_value'],
                    'campaign_id' => $campaignId,
                    'ad_unit_id' => $dimensions['ad_unit_id'] ?? null,
                ],
                [
                    'gam_network_code' => $networkCode,
                    'adx_link_data_id' => $linkData?->id,
                    'adx_link_id' => $linkData?->adx_link_id,
                    'adx_game_id' => $linkData?->adx_game_id,
                    'ad_unit_name' => $dimensions['ad_unit'] ?? null,
                    'impressions' => (int) ($row['ad_exchange_impressions'] ?? 0),
                    'clicks' => (int) ($row['ad_exchange_clicks'] ?? 0),
                    'requests' => (int) ($row['ad_exchange_responses_served'] ?? 0),
                    'matched_requests' => (int) ($row['ad_exchange_responses_served'] ?? 0),
                    'viewable_impressions' => 0,
                    'adx_revenue' => (float) ($row['ad_exchange_revenue'] ?? 0),
                    'ad_server_revenue' => 0,
                    'total_revenue' => (float) ($row['ad_exchange_revenue'] ?? 0),
                    'currency' => $currency,
                    'fetched_at' => $now,
                ],
            );

            $synced++;
        }

        return $synced;
    }
}

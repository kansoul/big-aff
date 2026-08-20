<?php

namespace App\Services\Integrations\Tracking;

use App\Models\EventClick;
use App\Models\EventView;
use App\Models\RealtimeReport;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Log;

class RealtimeReportSyncService
{
    /**
     * Sync event data from the three event tables to tracking_daily table
     */
    public static function sync(array $options = []): array
    {
        $startDate = $options['start_date'] ?? Carbon::now()->subDay()->toDateString();
        $endDate = $options['end_date'] ?? Carbon::now()->toDateString();

        $logger = Log::channel('sync_reports');
        $syncedCount = 0;
        $errorCount = 0;

        try {

            // Process each date in the range
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
                    $logger->error('[RealtimeReportSync] Date processing failed', [
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
            $logger->error('[RealtimeReportSync] Fatal error', [
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

    /**
     * Sync data for a specific date
     */
    private static function syncDateData(string $date): array
    {
        $syncedCount = 0;
        $errorCount = 0;

        $campaignIds = collect();
        $startOfDay = Carbon::parse($date)->startOfDay();
        $endOfDay = Carbon::parse($date)->endOfDay();

        $viewCampaignIds = EventView::where('created_at', '>=', $startOfDay)
            ->where('created_at', '<=', $endOfDay)
            ->distinct()
            ->pluck('campaign_id');
        $campaignIds = $campaignIds->merge($viewCampaignIds);

        $clickCampaignIds = EventClick::where('created_at', '>=', $startOfDay)
            ->where('created_at', '<=', $endOfDay)
            ->distinct()
            ->pluck('campaign_id');
        $campaignIds = $campaignIds->merge($clickCampaignIds);

        $campaignIds = $campaignIds->filter()->unique();

        foreach ($campaignIds as $campaignId) {
            try {
                self::syncCampaignForDate($date, (string) $campaignId);
                $syncedCount++;
            } catch (Exception $e) {
                $errorCount++;
                Log::channel('sync_reports')->error('[RealtimeReportSync] Campaign sync failed', [
                    'date' => $date,
                    'campaign_id' => $campaignId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return [
            'synced_count' => $syncedCount,
            'error_count' => $errorCount,
        ];
    }

    /**
     * Sync data for a specific campaign and date
     */
    public static function syncCampaignForDate(string $date, string $campaignId): void
    {
        $startOfDay = Carbon::parse($date)->startOfDay();
        $endOfDay = Carbon::parse($date)->endOfDay();

        $views = EventView::where('campaign_id', $campaignId)
            ->where('created_at', '>=', $startOfDay)
            ->where('created_at', '<=', $endOfDay)
            ->selectRaw("
                COALESCE(SUM(CASE WHEN type='page_view' THEN 1 ELSE 0 END), 0) AS view_count
            ")
            ->first();

        $clicks = EventClick::where('campaign_id', $campaignId)
            ->where('created_at', '>=', $startOfDay)
            ->where('created_at', '<=', $endOfDay)
            ->selectRaw("
                COALESCE(SUM(CASE WHEN type='redirect' THEN 1 ELSE 0 END), 0) AS redirect_count,
                COALESCE(SUM(CASE WHEN type='submit_form' THEN 1 ELSE 0 END), 0) AS submit_form_count
            ")
            ->first();

        $now = now();

        RealtimeReport::upsert(
            [[
                'event_time' => $date,
                'campaign_id' => $campaignId,
                'view_count' => $views->view_count,
                'redirect_count' => $clicks->redirect_count,
                'submit_form_count' => $clicks->submit_form_count,
                'created_at' => $now,
                'updated_at' => $now,
            ]],
            ['event_time', 'campaign_id'],
            [
                'view_count',
                'redirect_count',
                'submit_form_count',
                'updated_at',
            ],
        );
    }
}

<?php

namespace App\Services;

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
                'message' => 'Sync failed: ' . $e->getMessage(),
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

        $linkDataIds = collect();
        $startOfDay = Carbon::parse($date)->startOfDay();
        $endOfDay = Carbon::parse($date)->endOfDay();

        $viewLinkIds = EventView::where('created_at', '>=', $startOfDay)
            ->where('created_at', '<=', $endOfDay)
            ->distinct()
            ->pluck('link_data_id');
        $linkDataIds = $linkDataIds->merge($viewLinkIds);

        $clickLinkIds = EventClick::where('created_at', '>=', $startOfDay)
            ->where('created_at', '<=', $endOfDay)
            ->distinct()
            ->pluck('link_data_id');
        $linkDataIds = $linkDataIds->merge($clickLinkIds);

        $linkDataIds = $linkDataIds->unique();

        foreach ($linkDataIds as $linkDataId) {
            try {
                self::syncLinkDataForDate($date, $linkDataId);
                $syncedCount++;
            } catch (Exception $e) {
                $errorCount++;
                Log::channel('sync_reports')->error('[RealtimeReportSync] Link data sync failed', [
                    'date' => $date,
                    'link_data_id' => $linkDataId,
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
     * Sync data for a specific link_data_id and date
     */
    public static function syncLinkDataForDate(string $date, int $linkDataId): void
    {
        $startOfDay = Carbon::parse($date)->startOfDay();
        $endOfDay = Carbon::parse($date)->endOfDay();

        $views = EventView::where('link_data_id', $linkDataId)
            ->where('created_at', '>=', $startOfDay)
            ->where('created_at', '<=', $endOfDay)
            ->selectRaw("
                COALESCE(SUM(CASE WHEN type='view_article' THEN 1 ELSE 0 END), 0) AS view_article_count,
                COALESCE(SUM(CASE WHEN type='view_search'  THEN 1 ELSE 0 END), 0) AS view_search_count
            ")
            ->first();

        $clicks = EventClick::where('link_data_id', $linkDataId)
            ->where('created_at', '>=', $startOfDay)
            ->where('created_at', '<=', $endOfDay)
            ->selectRaw("
                COALESCE(SUM(CASE WHEN type='click_keyword' THEN 1 ELSE 0 END), 0) AS click_keyword_count,
                COALESCE(SUM(CASE WHEN type='click_ad'      THEN 1 ELSE 0 END), 0) AS click_ad_count
            ")
            ->first();

        $now = now();

        RealtimeReport::upsert(
            [[
                'event_time' => $date,
                'link_data_id' => $linkDataId,
                'view_article_count' => $views->view_article_count,
                'view_search_count' => $views->view_search_count,
                'click_keyword_count' => $clicks->click_keyword_count,
                'click_ad_count' => $clicks->click_ad_count,
                'created_at' => $now,
                'updated_at' => $now,
            ]],
            ['event_time', 'link_data_id'],
            [
                'view_article_count',
                'view_search_count',
                'click_keyword_count',
                'click_ad_count',
                'updated_at',
            ],
        );
    }
}

<?php

namespace App\Jobs;

use App\Models\ClickTracking;
use App\Models\EventAdLoad;
use App\Models\EventClick;
use App\Models\EventView;
use App\Models\RevenueReport;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use InvalidArgumentException;
use Throwable;

class SaveTrackingLogJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 60;

    public int $backoff = 5;

    public function __construct(
        public string $sessionId,
        public array $logData,
    ) {
        $this->onQueue('tracking');
    }

    public function handle(): void
    {
        try {
            $eventType = $this->logData['type'] ?? null;

            if (! $eventType) {
                throw new InvalidArgumentException('Event type is required');
            }
            $eventDate = $this->logData['created_at'] ?? now();
            $dateString = is_string($eventDate) ? $eventDate : $eventDate->toDateString();
            $dateOnly = substr($dateString, 0, 10);

            match (true) {
                $eventType === 'page_view' => $this->saveEventView($eventType, $dateOnly),
                $eventType === 'form_view' => $this->saveEventClick($eventType, $dateOnly),
                $eventType === 'lead' => $this->saveLeadEvent($eventType),
                in_array($eventType, ['ads_load_article_error', 'ads_load_search_error']) => $this->saveEventAdLoad($eventType),
                in_array($eventType, ['ads_load_article_success', 'ads_load_search_success']) => null,
                default => throw new InvalidArgumentException("Unknown event type: {$eventType}"),
            };
        } catch (InvalidArgumentException $e) {
            $this->logError($e);
        } catch (Exception $e) {
            $this->logError($e);
            throw $e;
        }
    }

    /**
     * Save the event view.
     */
    private function saveEventView(string $eventType, string $dateOnly): void
    {
        $now = now();

        EventView::create([
            'session_id' => $this->sessionId,
            'campaign_id' => $this->logData['campaign_id'] ?? null,
            'adset_id' => $this->logData['adset_id'] ?? null,
            'ad_id' => $this->logData['ad_id'] ?? null,
            'type' => $eventType,
            'page' => $this->logData['page'] ?? null,
            'query' => $this->logData['query'] ?? null,
            'traffic' => $this->logData['test'] ?? null,
            'event_time' => $this->logData['event_time'] ?? $now,
            'created_at' => $this->logData['created_at'] ?? $now,
        ]);

        $this->bufferDailyCount($dateOnly, (string) $this->logData['campaign_id'], $eventType);
    }

    /**
     * Save the event view.
     */
    private function saveEventClick(string $eventType, string $dateOnly): void
    {
        $now = now();

        EventClick::create([
            'session_id' => $this->sessionId,
            'campaign_id' => $this->logData['campaign_id'] ?? null,
            'adset_id' => $this->logData['adset_id'] ?? null,
            'ad_id' => $this->logData['ad_id'] ?? null,
            'type' => $eventType,
            'page' => $this->logData['page'] ?? null,
            'keyword_clicked' => $this->logData['keyword_clicked'] ?? null,
            'traffic' => $this->logData['test'] ?? null,
            'event_time' => $this->logData['event_time'] ?? $now,
            'created_at' => $this->logData['created_at'] ?? $now,
        ]);

        $this->bufferDailyCount($dateOnly, (string) $this->logData['campaign_id'], $eventType);
    }

    /**
     * Save the event ad load.
     */
    private function saveEventAdLoad(string $eventType): void
    {
        $now = now();

        EventAdLoad::create([
            'session_id' => $this->sessionId,
            'campaign_id' => $this->logData['campaign_id'] ?? null,
            'adset_id' => $this->logData['adset_id'] ?? null,
            'ad_id' => $this->logData['ad_id'] ?? null,
            'type' => $eventType,
            'container_type' => $this->logData['container_type'] ?? null,
            'load_time_ms' => $this->logData['load_time_ms'] ?? null,
            'ad_loaded' => false,
            'event_time' => $this->logData['event_time'] ?? $now,
            'created_at' => $this->logData['created_at'] ?? $now,
        ]);
    }

    /**
     * Save a lead event and its extensible values.
     */
    private function saveLeadEvent(string $eventType): void
    {
        $clickTracking = ClickTracking::create([
            'session_id' => $this->sessionId,
            'campaign_id' => $this->logData['campaign_id'] ?? null,
            'adset_id' => $this->logData['adset_id'] ?? null,
            'ad_id' => $this->logData['ad_id'] ?? null,
            'event_type' => $eventType,
            'page' => $this->logData['page'] ?? null,
            'payload' => $this->logData['values'] ?? $this->logData['payload'] ?? null,
            'event_time' => $this->logData['event_time'] ?? now(),
        ]);

        RevenueReport::updateOrCreate(
            ['session_id' => $this->sessionId],
            [
                'campaign_id' => $this->logData['campaign_id'],
                'adset_id' => $this->logData['adset_id'] ?? null,
                'ad_id' => $this->logData['ad_id'] ?? null,
                'click_id' => $clickTracking->id,
                'estimate_earning' => $this->logData['estimate_earning']
                    ?? data_get($this->logData, 'values.estimate_earning')
                    ?? data_get($this->logData, 'payload.estimate_earning')
                    ?? 0,
                'page_views' => $this->revenueValue('page_views'),
                'clicks' => $this->revenueValue('clicks'),
                'ad_requests' => $this->revenueValue('ad_requests'),
                'impressions' => $this->revenueValue('impressions'),
                'ad_requests_rpm' => $this->revenueValue('ad_requests_rpm'),
                'impressions_rpm' => $this->revenueValue('impressions_rpm'),
                'cost_per_click' => $this->revenueValue('cost_per_click'),
                'funnel_requests' => $this->revenueValue('funnel_requests'),
                'funnel_impressions' => $this->revenueValue('funnel_impressions'),
                'funnel_clicks' => $this->revenueValue('funnel_clicks'),
                'funnel_rpm' => $this->revenueValue('funnel_rpm'),
            ],
        );
    }

    private function revenueValue(string $field): mixed
    {
        return $this->logData[$field]
            ?? data_get($this->logData, "values.{$field}")
            ?? data_get($this->logData, "payload.{$field}");
    }

    /**
     * Buffer the daily count into Redis with an atomic HINCRBY.
     */
    private function bufferDailyCount(string $date, string $campaignId, string $eventType): void
    {
        $page = $this->logData['page'] ?? null;
        $column = match (true) {
            $eventType === 'page_view' && $page === 'article' => 'view_article_count',
            $eventType === 'page_view' && $page === 'search' => 'view_search_count',
            $eventType === 'form_view' && $page === 'article' => 'click_keyword_count',
            $eventType === 'form_view' && $page === 'search' => 'click_ad_count',
            default => null,
        };

        if (! $column) {
            return;
        }

        $key = "tracking_daily:{$date}:{$campaignId}";

        Redis::hincrby($key, $column, 1);
        Redis::expire($key, 90_000);
    }

    /**
     * Log the error.
     */
    private function logError(Exception $exception): void
    {
        Log::channel('tracking_events')->error('Failed to save tracking event', [
            'timestamp' => now(),
            'session_id' => $this->sessionId,
            'campaign_id' => $this->logData['campaign_id'] ?? null,
            'type' => $this->logData['type'] ?? 'unknown',
            'error' => $exception->getMessage(),
            'stack_trace' => $exception->getTraceAsString(),
        ]);
    }

    /**
     * Handle the failed job.
     */
    public function failed(Throwable $exception): void
    {
        Log::channel('tracking_events')->critical('SaveTrackingLogJob failed after all retries', [
            'timestamp' => now(),
            'session_id' => $this->sessionId,
            'campaign_id' => $this->logData['campaign_id'] ?? null,
            'type' => $this->logData['type'] ?? 'unknown',
            'error' => $exception->getMessage(),
            'stack_trace' => $exception->getTraceAsString(),
        ]);
    }
}

<?php

namespace App\Jobs;

use App\Models\EventAdLoad;
use App\Models\EventClick;
use App\Models\EventView;
use App\Models\LinkData;
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
        public LinkData $linkData,
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
                in_array($eventType, ['view_article', 'view_search']) => $this->saveEventView($eventType, $dateOnly),
                in_array($eventType, ['click_keyword', 'click_ad']) => $this->saveEventClick($eventType, $dateOnly),
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
            'link_data_id' => $this->linkData->id,
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

        $this->bufferDailyCount($dateOnly, $this->linkData->id, $eventType);
    }

    /**
     * Save the event view.
     */
    private function saveEventClick(string $eventType, string $dateOnly): void
    {
        $now = now();

        EventClick::create([
            'session_id' => $this->sessionId,
            'link_data_id' => $this->linkData->id,
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

        $this->bufferDailyCount($dateOnly, $this->linkData->id, $eventType);
    }

    /**
     * Save the event ad load.
     */
    private function saveEventAdLoad(string $eventType): void
    {
        $now = now();

        EventAdLoad::create([
            'session_id' => $this->sessionId,
            'link_data_id' => $this->linkData->id,
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
     * Buffer the daily count into Redis with an atomic HINCRBY.
     */
    private function bufferDailyCount(string $date, int $linkDataId, string $eventType): void
    {
        $column = match ($eventType) {
            'view_article' => 'view_article_count',
            'view_search' => 'view_search_count',
            'click_keyword' => 'click_keyword_count',
            'click_ad' => 'click_ad_count',
            default => null,
        };

        if (! $column) {
            return;
        }

        $key = "tracking_daily:{$date}:{$linkDataId}";

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
            'link_data_id' => $this->linkData->id,
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
            'link_data_id' => $this->linkData->id,
            'type' => $this->logData['type'] ?? 'unknown',
            'error' => $exception->getMessage(),
            'stack_trace' => $exception->getTraceAsString(),
        ]);
    }
}

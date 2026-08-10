<?php

namespace App\Jobs;

use App\Models\ClickTracking;
use App\Models\EventClick;
use App\Models\EventView;
use App\Models\LeadSubmission;
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
     * Save a lead event and its extensible values.
     */
    private function saveLeadEvent(string $eventType): void
    {
        $this->saveLeadSubmission();

        ClickTracking::create([
            'session_id' => $this->sessionId,
            'campaign_id' => $this->logData['campaign_id'] ?? null,
            'adset_id' => $this->logData['adset_id'] ?? null,
            'ad_id' => $this->logData['ad_id'] ?? null,
            'event_type' => $eventType,
            'page' => $this->logData['page'] ?? null,
            'payload' => $this->logData['values'] ?? $this->logData['payload'] ?? null,
            'event_time' => $this->logData['event_time'] ?? now(),
        ]);
    }

    /**
     * Persist the values the user typed into the apply wizard.
     */
    private function saveLeadSubmission(): void
    {
        $leadData = $this->logData['lead_data'] ?? null;

        if (! is_array($leadData) || $leadData === []) {
            return;
        }

        $attributes = [
            'session_id' => $this->sessionId,
            'campaign_id' => $this->logData['campaign_id'] ?? null,
            'adset_id' => $this->logData['adset_id'] ?? null,
            'ad_id' => $this->logData['ad_id'] ?? null,
            'page' => $this->logData['page'] ?? null,
            'event_time' => $this->logData['event_time'] ?? now(),
        ];

        $extra = [];

        foreach ($leadData as $key => $value) {
            if ($value === null || $value === '') {
                continue;
            }

            if (isset(LeadSubmission::FIELD_MAP[$key])) {
                $attributes[LeadSubmission::FIELD_MAP[$key]] = $value;

                continue;
            }

            $extra[$key] = $value;
        }

        $attributes['extra'] = $extra ?: null;

        LeadSubmission::create($attributes);
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

<?php

namespace App\Jobs;

use App\Enums\AdsConversionType;
use App\Enums\EventPage;
use App\Models\AdsConversion;
use App\Models\Campaign;
use App\Models\EventClick;
use App\Models\EventView;
use App\Models\RevenueReport;
use App\Models\TrackingSession;
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

    /** The session row was opened by this very event. Declared, not promoted,
     * so jobs queued before it existed still unserialize. */
    public bool $isNewSession = false;

    /**
     * @param  array<string, mixed>  $logData
     */
    public function __construct(
        public string $sessionId,
        public array $logData,
        bool $isNewSession = false,
    ) {
        $this->isNewSession = $isNewSession;
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
                in_array($eventType, ['redirect', 'lead'], true) => $this->saveEventClick($eventType, $dateOnly),
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
            'page' => $this->resolvePage(),
            'utm_source' => $this->logData['utm_source'] ?? null,
            'placement' => $this->logData['placement'] ?? null,
            'cpid' => $this->logData['cpid'] ?? null,
            'lpid' => $this->logData['lpid'] ?? null,
            'query' => $this->logData['query'] ?? null,
            'keyword_clicked' => $this->logData['keyword_clicked'] ?? null,
            'traffic' => $this->logData['test'] ?? null,
            'event_time' => $this->logData['event_time'] ?? $now,
            'created_at' => $this->logData['created_at'] ?? $now,
        ]);

        $this->saveRevenueReport();
        $this->saveAdsConversion();

        $this->bufferDailyCount($dateOnly, (string) ($this->logData['campaign_id'] ?? ''), $eventType);
    }

    /**
     * Open the revenue row for the visit. Only the event that opened the
     * session does it, so a returning visitor on the same session never adds a
     * second row; firstOrCreate keeps it safe if two events race.
     */
    private function saveRevenueReport(): void
    {
        if (! $this->isNewSession || blank($this->logData['campaign_id'] ?? null)) {
            return;
        }

        RevenueReport::firstOrCreate(
            ['session_id' => $this->sessionId],
            [
                'campaign_id' => $this->logData['campaign_id'] ?? null,
                'adset_id' => $this->logData['adset_id'] ?? null,
                'ad_id' => $this->logData['ad_id'] ?? null,
                'revenue' => 0,
                'created_at' => $this->logData['created_at'] ?? now(),
            ],
        );
    }

    /**
     * Store the ads click identifiers the landing hit carried, so the
     * conversion can be attributed later. Only written once per session, and
     * never when the visitor did not arrive from an ad.
     */
    private function saveAdsConversion(): void
    {
        if (! $this->isNewSession) {
            return;
        }

        $clickIds = array_filter([
            'gclid' => $this->logData['gclid'] ?? null,
            'wbraid' => $this->logData['wbraid'] ?? null,
            'gbraid' => $this->logData['gbraid'] ?? null,
            'ttclid' => $this->logData['ttclid'] ?? null,
        ]);

        if ($clickIds === []) {
            return;
        }

        $session = TrackingSession::find($this->sessionId);
        $campaignId = $this->logData['campaign_id'] ?? null;
        $type = isset($clickIds['ttclid'])
            ? AdsConversionType::TIKTOK->value
            : AdsConversionType::GOOGLE->value;

        AdsConversion::firstOrCreate(
            [
                'session_id' => $this->sessionId,
                'type' => $type,
            ],
            [
                ...$clickIds,
                'account_id' => Campaign::where('campaign_id', $campaignId)->value('account_id'),
                'campaign_id' => $campaignId,
                'ip_address' => $session?->ip_address,
                'user_agent' => $session?->user_agent,
                'conversion_date_time' => now()->format('Y-m-d H:i:sP'),
            ],
        );
    }

    /**
     * Save the event click (redirect or lead).
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
            'page' => $this->resolvePage(),
            'utm_source' => $this->logData['utm_source'] ?? null,
            'placement' => $this->logData['placement'] ?? null,
            'cpid' => $this->logData['cpid'] ?? null,
            'lpid' => $this->logData['lpid'] ?? null,
            'query' => $this->logData['query'] ?? null,
            'keyword_clicked' => $this->logData['keyword_clicked'] ?? null,
            'traffic' => $this->logData['test'] ?? null,
            'event_time' => $this->logData['event_time'] ?? $now,
            'created_at' => $this->logData['created_at'] ?? $now,
        ]);

        $this->saveRevenueReport();
        $this->saveAdsConversion();

        $this->bufferDailyCount($dateOnly, (string) ($this->logData['campaign_id'] ?? ''), $eventType);
    }

    /**
     * The page column is an enum; anything outside it falls back to the only
     * page currently in production.
     */
    private function resolvePage(): string
    {
        $page = $this->logData['page'] ?? null;

        return EventPage::tryFrom((string) $page)?->value ?? EventPage::Quickpayly->value;
    }

    /**
     * Buffer the daily count into Redis with an atomic HINCRBY.
     */
    private function bufferDailyCount(string $date, string $campaignId, string $eventType): void
    {
        $column = match ($eventType) {
            'page_view' => 'view_count',
            'redirect' => 'redirect_count',
            'lead' => 'lead_count',
            default => null,
        };

        if (! $column) {
            return;
        }

        if ($campaignId === '') {
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

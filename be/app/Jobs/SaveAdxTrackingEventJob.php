<?php

namespace App\Jobs;

use App\Models\AdxAccountConversion;
use App\Models\AdxCampaign;
use App\Models\AdxConversion;
use App\Models\AdxEventClick;
use App\Models\AdxEventView;
use App\Models\AdxLink;
use App\Models\AdxLinkData;
use Carbon\Carbon;
use Exception;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Throwable;

class SaveAdxTrackingEventJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 60;

    public int $backoff = 5;

    private const VIEW_TYPES = ['landing_view', 'detail_view'];

    private const CLICK_TYPES = ['get_game_link_click', 'get_bonus_click'];

    /**
     * @param  array<string, mixed>  $eventData
     */
    public function __construct(
        public array $eventData,
    ) {
        $this->onQueue(config('queue.queues.adx-tracking', 'adx-tracking'));
    }

    public function handle(): void
    {
        try {
            $eventType = $this->eventData['event_type'] ?? null;
            if (! is_string($eventType)) {
                throw new InvalidArgumentException('AdX event_type is required.');
            }

            if (! in_array($eventType, [...self::VIEW_TYPES, ...self::CLICK_TYPES], true)) {
                throw new InvalidArgumentException("Unknown AdX event type: {$eventType}");
            }

            $campaign = $this->resolveCampaign();
            if ($campaign === null) {
                return;
            }

            $this->eventData['source'] = $campaign->source;

            DB::transaction(function () use ($eventType, $campaign): void {
                $occurredAt = Carbon::parse($this->eventData['occurred_at'] ?? now());
                $link = $this->resolveLink();

                $linkData = $this->findOrCreateLinkData($occurredAt, $link, $campaign);

                if (! $linkData) {
                    return;
                }

                $this->storeRawEvent($eventType, $occurredAt, $linkData);
                $this->storeConversion($eventType, $occurredAt, $linkData, $campaign);
                $this->bufferRealtimeCount($occurredAt->toDateString(), $linkData->id, $eventType);
            });
        } catch (InvalidArgumentException $e) {
            $this->logError($e);
        } catch (Exception $e) {
            $this->logError($e);
            throw $e;
        }
    }

    private function resolveLink(): ?AdxLink
    {
        $sourceId = $this->eventData['source_id'] ?? null;
        if (! is_numeric($sourceId)) {
            return null;
        }

        return AdxLink::query()->find((int) $sourceId);
    }

    private function resolveCampaign(): ?AdxCampaign
    {
        $campaignId = $this->eventData['campaign_id'] ?? null;
        $source = $this->eventData['source'] ?? null;

        if (! is_string($campaignId) || $campaignId === '') {
            return null;
        }

        return AdxCampaign::query()
            ->with('account')
            ->where('campaign_id', $campaignId)
            ->when(is_string($source) && $source !== '', fn ($query) => $query->where('source', $source))
            ->first();
    }

    private function findOrCreateLinkData(Carbon $occurredAt, ?AdxLink $link, AdxCampaign $campaign): AdxLinkData
    {
        $linkData = AdxLinkData::query()
            ->where('source', $this->eventData['source'])
            ->where('campaign_id', $this->eventData['campaign_id'])
            ->where('adx_link_id', $link?->id)
            ->lockForUpdate()
            ->first() ?? new AdxLinkData([
                'source' => $this->eventData['source'],
                'campaign_id' => $this->eventData['campaign_id'],
                'adx_link_id' => $link?->id,
            ]);

        $linkData->fill([
            'account_id' => $campaign->account?->account_id ?? $linkData->account_id,
            'adx_game_id' => $link?->adx_game_id ?? $linkData->adx_game_id,
            'first_seen_at' => $linkData->first_seen_at ?: $occurredAt,
            'last_seen_at' => $occurredAt,
        ])->save();

        return $linkData;
    }

    private function storeRawEvent(string $eventType, Carbon $occurredAt, AdxLinkData $linkData): void
    {
        $payload = [
            'adx_link_data_id' => $linkData->id,
            'page_key' => $this->eventData['page_key'] ?? $this->defaultPageKey($eventType),
            'event_type' => $eventType,
            'occurred_at' => $occurredAt,
        ];

        if (in_array($eventType, self::VIEW_TYPES, true)) {
            AdxEventView::query()->create($payload);

            return;
        }

        AdxEventClick::query()->create($payload);
    }

    private function storeConversion(string $eventType, Carbon $occurredAt, AdxLinkData $linkData, AdxCampaign $campaign): void
    {
        $accountId = $campaign->account?->account_id;
        $mapping = null;

        if ($accountId !== null) {
            $mapping = AdxAccountConversion::query()
                ->where('source', $this->eventData['source'])
                ->where('account_id', $accountId)
                ->where('conversion_type', $eventType)
                ->where('status', 'active')
                ->first();
        }

        $hasGoogleClickId = ! empty($this->eventData['gclid'])
            || ! empty($this->eventData['gbraid'])
            || ! empty($this->eventData['wbraid']);

        $syncStatus = match (true) {
            $this->eventData['source'] !== 'google' => 'not_uploadable',
            $accountId === null => 'pending_account',
            ! $mapping => 'pending_account',
            ! $hasGoogleClickId => 'not_uploadable',
            default => 'pending',
        };

        AdxConversion::query()->create([
            'event_id' => Str::uuid()->toString(),
            'adx_link_data_id' => $linkData->id,
            'source' => $this->eventData['source'],
            'account_id' => $accountId,
            'campaign_id' => $this->eventData['campaign_id'],
            'conversion_type' => $eventType,
            'conversion_action_id' => $mapping?->conversion_action_id,
            'conversion_value' => $this->eventData['conversion_value'] ?? 0,
            'currency' => strtoupper($this->eventData['currency'] ?? 'USD'),
            'gclid' => $this->eventData['gclid'] ?? null,
            'gbraid' => $this->eventData['gbraid'] ?? null,
            'wbraid' => $this->eventData['wbraid'] ?? null,
            'occurred_at' => $occurredAt,
            'sync_status' => $syncStatus,
        ]);
    }

    private function bufferRealtimeCount(string $date, int $linkDataId, string $eventType): void
    {
        $column = match ($eventType) {
            'landing_view' => 'landing_views',
            'get_game_link_click' => 'get_game_link_clicks',
            'detail_view' => 'detail_views',
            'get_bonus_click' => 'get_bonus_clicks',
        };

        $key = "adx_realtime:{$date}:{$linkDataId}";

        Redis::hincrby($key, $column, 1);
        Redis::expire($key, 90_000);
    }

    private function defaultPageKey(string $eventType): string
    {
        return in_array($eventType, ['landing_view', 'get_game_link_click'], true) ? 'landing' : 'detail';
    }

    private function logError(Exception $exception): void
    {
        Log::channel('tracking_events')->error('Failed to save AdX tracking event', [
            'timestamp' => now(),
            'campaign_id' => $this->eventData['campaign_id'] ?? null,
            'event_type' => $this->eventData['event_type'] ?? null,
            'error' => $exception->getMessage(),
        ]);
    }

    public function failed(Throwable $exception): void
    {
        Log::channel('tracking_events')->critical('SaveAdxTrackingEventJob failed after all retries', [
            'timestamp' => now(),
            'campaign_id' => $this->eventData['campaign_id'] ?? null,
            'event_type' => $this->eventData['event_type'] ?? null,
            'error' => $exception->getMessage(),
            'stack_trace' => $exception->getTraceAsString(),
        ]);
    }
}

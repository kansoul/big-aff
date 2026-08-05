<?php

namespace App\Jobs;

use App\Models\AdsLink;
use App\Models\PixelConversion;
use App\Models\TrackingSession;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class StorePixelConversionJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $backoff = 5;

    /**
     * @param  array<string, mixed>  $data
     */
    public function __construct(public array $data, public string $conversionDateTime)
    {
        //
    }

    public function handle(): void
    {
        try {
            $adsLink = AdsLink::query()
                ->where('tracking_code', $this->data['tracking_code'])
                ->first();

            $session = isset($this->data['session_id'])
                ? TrackingSession::where('session_id', $this->data['session_id'])->first()
                : null;

            $trackingIds = $adsLink?->tracking_ids ?? [];

            $conversion = PixelConversion::create([
                'ads_link_id' => $adsLink?->id,
                'tracking_code' => $this->data['tracking_code'],
                'platform' => $this->data['platform'] ?? 'tiktok',
                'advertiser_id' => $this->data['advertiser_id'] ?? ($trackingIds['tiktokid'][0] ?? null),
                'pixel_id' => $this->data['pixel_id'] ?? ($trackingIds['tiktok_pixel_id'][0] ?? null),
                'event_name' => $this->data['event_name'] ?? null,
                'event_id' => $this->data['event_id'] ?? null,
                'session_id' => $this->data['session_id'] ?? null,
                'campaign_id' => $this->data['campaign_id'] ?? null,
                'adset_id' => $this->data['adset_id'] ?? null,
                'ad_id' => $this->data['ad_id'] ?? null,
                'click_id' => $this->data['click_id'] ?? null,
                'conversion_value' => $this->data['conversion_value'] ?? null,
                'currency_code' => $this->data['currency_code'] ?? null,
                'ip_address' => $session?->ip_address,
                'user_agent' => $session?->user_agent,
                'payload' => $this->data['payload'] ?? null,
                'conversion_date_time' => $this->conversionDateTime,
                'postback_url' => $adsLink?->postback_url,
            ]);

            if (! empty($adsLink?->postback_url)) {
                SendConversionPostbackJob::dispatch($conversion->id)
                    ->onQueue(config('queue.queues.pixel-conversion'));
            }
        } catch (Throwable $e) {
            // Not rethrown: a retry after the row was created would duplicate the conversion.
            Log::error('PixelConversion job error: '.$e->getMessage());
        }
    }
}

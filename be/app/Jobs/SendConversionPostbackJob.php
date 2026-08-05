<?php

namespace App\Jobs;

use App\Models\PixelConversion;
use App\Services\Postback\PostbackUrlBuilder;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendConversionPostbackJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [30, 60, 120];

    public function __construct(public int $pixelConversionId)
    {
        //
    }

    public function handle(PostbackUrlBuilder $urlBuilder): void
    {
        $conversion = PixelConversion::find($this->pixelConversionId);

        if (! $conversion || empty($conversion->postback_url)) {
            return;
        }

        // Already delivered — a retry must not fire the postback twice.
        if ($conversion->postback_sent_at !== null) {
            return;
        }

        $url = $urlBuilder->build($conversion->postback_url, $conversion);

        $conversion->increment('postback_attempts');

        try {
            $response = Http::timeout(10)->get($url);

            $conversion->update([
                'postback_status' => $response->status(),
                'postback_response' => mb_substr($response->body(), 0, 1000),
                'postback_sent_at' => $response->successful() ? now() : null,
            ]);

            if (! $response->successful()) {
                throw new \RuntimeException("Postback returned HTTP {$response->status()}");
            }
        } catch (Throwable $e) {
            $conversion->update([
                'postback_response' => mb_substr($e->getMessage(), 0, 1000),
            ]);

            Log::error('Conversion postback failed', [
                'pixel_conversion_id' => $conversion->id,
                'url' => $url,
                'attempt' => $conversion->postback_attempts,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}

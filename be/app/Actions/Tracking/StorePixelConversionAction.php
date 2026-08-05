<?php

namespace App\Actions\Tracking;

use App\Jobs\StorePixelConversionJob;
use Illuminate\Support\Facades\Log;
use Throwable;

class StorePixelConversionAction
{
    /**
     * Persist a pixel conversion and fire the upstream postback.
     *
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): bool
    {
        try {
            $now = now()->format('Y-m-d H:i:sP');
            StorePixelConversionJob::dispatch($data, $now)->onQueue(config('queue.queues.pixel-conversion'));

            return true;
        } catch (Throwable $e) {
            Log::error('PixelConversion store error: '.$e->getMessage());

            return false;
        }
    }
}

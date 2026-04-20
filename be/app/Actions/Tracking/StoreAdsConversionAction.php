<?php

namespace App\Actions\Tracking;

use App\Jobs\StoreAdsConversionJob;
use Illuminate\Support\Facades\Log;
use Throwable;

class StoreAdsConversionAction
{
    /**
     * save ads conversion
     */
    public function execute(array $data): bool
    {
        try {
            $now = now()->format('Y-m-d H:i:sP');
            StoreAdsConversionJob::dispatch($data, $now)->onQueue(config('queue.queues.ads-conversion'));

            return true;
        } catch (Throwable $e) {
            Log::error('AdsConversion store error: '.$e->getMessage());

            return false;
        }
    }
}

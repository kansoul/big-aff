<?php

namespace App\Actions\Adx\Tracking;

use App\Jobs\SaveAdxTrackingEventJob;

class StoreAdxFunnelEventAction
{
    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function execute(array $data): array
    {
        SaveAdxTrackingEventJob::dispatch($data);

        return ['success' => true];
    }
}

<?php

namespace App\Services\Adx;

use App\Actions\Adx\Tracking\StoreAdxFunnelEventAction;

class AdxTrackingService
{
    public function __construct(
        private readonly StoreAdxFunnelEventAction $storeEventAction,
    ) {}

    public function storeEvent(array $data): array
    {
        return $this->storeEventAction->execute($data);
    }
}

<?php

namespace App\Services\Tracking;

use App\Actions\Tracking\GetAdsLinkTrackingConfigAction;
use App\Actions\Tracking\StoreAdsConversionAction;
use App\Actions\Tracking\StoreTrackingLogAction;

class TrackingService
{
    public function __construct(
        protected StoreTrackingLogAction $storeTrackingLogAction,
        protected StoreAdsConversionAction $storeAdsConversionAction,
        protected GetAdsLinkTrackingConfigAction $getAdsLinkTrackingConfigAction,
    ) {}

    /**
     * @param  array<string, mixed>  $validatedData
     * @return string the session the event was recorded on
     */
    public function handleLog(array $validatedData): string
    {
        return $this->storeTrackingLogAction->execute($validatedData);
    }

    /**
     * @param  array<string, mixed>  $validatedData
     */
    public function storeAdsConversion(array $validatedData): void
    {
        $this->storeAdsConversionAction->execute($validatedData);
    }

    /** @return array<string, mixed> */
    public function config(string $trackingCode): array
    {
        return $this->getAdsLinkTrackingConfigAction->execute($trackingCode);
    }
}

<?php

namespace App\Actions\AdsDeliveryEntities;

use App\Models\AdsetInsightsReport;
use App\Services\Integrations\Ads\AdsStatusService;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;

class ToggleAdsetStatusAction
{
    public function __construct(
        private readonly AdsStatusService $adsStatusService,
    ) {}

    /**
     * @throws AuthorizationException
     */
    public function execute(int $adsetInsightId, string $newStatus): AdsetInsightsReport
    {
        $ownership = OwnershipFilter::forAuthUser();

        $query = AdsetInsightsReport::query()->where('id', $adsetInsightId);

        $ownership->applyThroughAccount($query);

        $record = $query->firstOrFail();

        if (! in_array($record->status, ['ACTIVE', 'PAUSED'])) {
            throw new AuthorizationException('Cannot toggle status for adset with current status: '.$record->status);
        }

        $this->adsStatusService->updateAdsetStatus($record->adset_id, $newStatus);

        $record->update(['status' => $newStatus]);

        return $record->fresh();
    }
}

<?php

namespace App\Actions\AdsDeliveryEntities;

use App\Models\Account;
use App\Models\AdsInsightsReport;
use App\Services\Integrations\Ads\AdsStatusService;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;

class ToggleAdStatusAction
{
    public function __construct(
        private readonly AdsStatusService $adsStatusService,
    ) {}

    /**
     * @throws AuthorizationException
     */
    public function execute(int $adsInsightId, string $newStatus): AdsInsightsReport
    {
        $record = AdsInsightsReport::findOrFail($adsInsightId);

        $ownership = OwnershipFilter::forAuthUser();

        if (! $ownership->isAdmin()) {
            $account = Account::where('account_id', $record->account_id)->first();
            if ($account) {
                $ownership->authorizeAccount($account);
            }
        }

        if (! in_array($record->status, ['ACTIVE', 'PAUSED'])) {
            throw new AuthorizationException('Cannot toggle status for ad with current status: '.$record->status);
        }

        $this->adsStatusService->updateAdStatus($record->ad_id, $newStatus);

        $record->update(['status' => $newStatus]);

        return $record->fresh();
    }
}

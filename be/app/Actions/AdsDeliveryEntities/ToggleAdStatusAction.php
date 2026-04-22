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
        $ownership = OwnershipFilter::forAuthUser();

        $query = AdsInsightsReport::query()->where('id', $adsInsightId);

        $ownership->applyThrough(
            $query,
            'account_id',
            fn (array $ids) => Account::join('account_user', 'account_user.account_id', '=', 'accounts.id')
                ->whereIn('account_user.user_id', $ids)
                ->select('accounts.id'),
        );

        $record = $query->firstOrFail();

        if (! in_array($record->status, ['ACTIVE', 'PAUSED'])) {
            throw new AuthorizationException('Cannot toggle status for ad with current status: '.$record->status);
        }

        $this->adsStatusService->updateAdStatus($record->ad_id, $newStatus);

        $record->update(['status' => $newStatus]);

        return $record->fresh();
    }
}

<?php

namespace App\Actions\CampaignReport;

use App\Models\Account;
use App\Models\Campaign;
use App\Models\CampaignReport;
use App\Services\Integrations\Ads\AdsStatusService;
use App\Support\OwnerResource\AccountOwnerResource;
use Google\Ads\GoogleAds\V21\Enums\BiddingStrategyTypeEnum\BiddingStrategyType;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class UpdateCampaignReportTargetCpaAction
{
    /**
     * @return array{success: bool, message: string, status: int, target_cpa?: float}
     */
    public function execute(string $campaignId, float $targetCpa): array
    {
        $reportRow = CampaignReport::query()
            ->where('campaign_id', $campaignId)
            ->orderByDesc('date_start')
            ->first();

        if ($reportRow === null) {
            return [
                'success' => false,
                'message' => 'Campaign not found.',
                'status' => 404,
            ];
        }

        $adsType = (string) ($reportRow->ads_type ?? '');
        $accountId = $reportRow->account_id;

        if ($adsType !== 'google') {
            return [
                'success' => false,
                'message' => 'Target CPA can only be set for Google campaigns.',
                'status' => 422,
            ];
        }

        if ($accountId === null) {
            return [
                'success' => false,
                'message' => 'Campaign is missing account_id.',
                'status' => 422,
            ];
        }

        if (in_array((int) $reportRow->bidding_strategy_type, [BiddingStrategyType::TARGET_ROAS, BiddingStrategyType::MAXIMIZE_CONVERSION_VALUE], true)) {
            return [
                'success' => false,
                'message' => 'Target CPA cannot be set for ROAS-based bidding strategies.',
                'status' => 422,
            ];
        }

        $resource = new AccountOwnerResource;
        if (! $resource->isAdmin()) {
            $account = Account::where('account_id', $accountId)->first();

            if ($account === null) {
                return [
                    'success' => false,
                    'message' => 'Account not found.',
                    'status' => 404,
                ];
            }

            $resource->authorize($account);
        }

        try {
            $success = app(AdsStatusService::class)->updateCampaignTargetCpa($campaignId, $targetCpa);

            if (! $success) {
                return [
                    'success' => false,
                    'message' => 'Failed to update target CPA in Ads platform.',
                    'status' => 500,
                ];
            }

            Campaign::query()
                ->where('campaign_id', $campaignId)
                ->update([
                    'target_cpa' => $targetCpa,
                    'updated_by' => Auth::id(),
                ]);

            CampaignReport::query()
                ->where('campaign_id', $campaignId)
                ->update(['target_cpa' => $targetCpa]);

            return [
                'success' => true,
                'message' => 'Target CPA updated.',
                'status' => 200,
                'target_cpa' => $targetCpa,
            ];
        } catch (\Throwable $e) {
            Log::error('CampaignReport update target CPA error', [
                'campaign_id' => $campaignId,
                'target_cpa' => $targetCpa,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'An error occurred while updating target CPA: ' . $e->getMessage(),
                'status' => 500,
            ];
        }
    }
}

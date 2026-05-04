<?php

namespace App\Actions\CampaignReport;

use App\Models\Account;
use App\Models\Campaign;
use App\Models\CampaignReport;
use App\Services\Integrations\Ads\AdsStatusService;
use App\Support\OwnerResource\AccountOwnerResource;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ToggleCampaignReportStatusAction
{
    /**
     * @return array{success: bool, message: string, status: int, status_value?: string}
     */
    public function execute(string $campaignId, string $newStatus): array
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

        if ($adsType === '' || $accountId === null) {
            return [
                'success' => false,
                'message' => 'Campaign is missing ads_type or account_id.',
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
            $success = app(AdsStatusService::class)->updateCampaignStatus($campaignId, $newStatus, canChangeGoogle: true);

            if (! $success) {
                return [
                    'success' => false,
                    'message' => 'Failed to update campaign status in Ads platform.',
                    'status' => 500,
                ];
            }

            Campaign::query()
                ->where('campaign_id', $campaignId)
                ->update([
                    'status' => $newStatus,
                    'updated_by' => Auth::id(),
                ]);

            CampaignReport::query()
                ->where('campaign_id', $campaignId)
                ->update(['campaign_status' => $newStatus]);

            return [
                'success' => true,
                'message' => "Campaign is now {$newStatus}",
                'status' => 200,
                'status_value' => $newStatus,
            ];
        } catch (\Throwable $e) {
            Log::error('CampaignReport toggle status error', [
                'campaign_id' => $campaignId,
                'new_status' => $newStatus,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'message' => 'An error occurred while updating status: '.$e->getMessage(),
                'status' => 500,
            ];
        }
    }
}

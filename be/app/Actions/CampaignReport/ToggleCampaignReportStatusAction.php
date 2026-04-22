<?php

namespace App\Actions\CampaignReport;

use App\Models\Campaign;
use App\Models\CampaignReport;
use App\Services\Integrations\Facebook\FacebookAdsService;
use App\Services\Integrations\Google\GoogleAdsService;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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

        $ownership = OwnershipFilter::forAuthUser();
        if (! $ownership->isAdmin()) {
            $allowed = DB::table('accounts')
                ->where('accounts.id', $accountId)
                ->whereNull('accounts.deleted_at')
                ->join('account_user', 'account_user.account_id', '=', 'accounts.id')
                ->whereIn('account_user.user_id', $ownership->allowedUserIds())
                ->exists();

            if (! $allowed) {
                $ownership->authorize(null);
            }
        }

        try {
            $success = match ($adsType) {
                'facebook' => app(FacebookAdsService::class)->updateCampaignStatus($campaignId, $newStatus),
                'google' => app(GoogleAdsService::class)->updateCampaignStatus($accountId, $campaignId, $newStatus),
                default => false,
            };

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

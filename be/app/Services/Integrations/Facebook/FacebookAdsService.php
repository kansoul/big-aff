<?php

namespace App\Services\Integrations\Facebook;

use App\Jobs\SendTelegramWarningJob;
use App\Models\Account;
use App\Models\AdsLink;
use Carbon\Carbon;
use Exception;
use FacebookAds\Api;
use FacebookAds\Cursor;
use FacebookAds\Object\AdAccount;
use FacebookAds\Object\Campaign;
use Illuminate\Support\Facades\Log;

class FacebookAdsService
{
    protected string $accessToken;

    protected string $appSecret;

    protected string $appId;

    public function __construct()
    {
        $this->accessToken = config('facebook.facebook_default.access_token');
        $this->appSecret = config('facebook.facebook_default.app_secret');
        $this->appId = config('facebook.facebook_default.app_id');
        Api::init($this->appId, $this->appSecret, $this->accessToken);
    }

    /**
     * Configure or override Facebook credentials at runtime.
     */
    public function configure(?string $accessToken = null, ?string $appSecret = null, ?string $appId = null): void
    {
        if ($accessToken !== null) {
            $this->accessToken = $accessToken;
        }

        if ($appSecret !== null) {
            $this->appSecret = $appSecret;
        }

        if ($appId !== null) {
            $this->appId = $appId;
        }
        // Ensure SDK uses the latest configured credentials
        Api::init($this->appId, $this->appSecret, $this->accessToken);
    }

    /**
     * Verify if campaign exists on Facebook and return campaign data
     */
    public function verifyCampaign(string $campaignId, bool $shouldWarn, AdsLink $adsLink): ?array
    {
        try {
            $campaign = new Campaign($campaignId);
            $campaignData = $campaign->getSelf(['id', 'name', 'status', 'created_time', 'start_time', 'stop_time', 'updated_time', 'daily_budget', 'lifetime_budget', 'account_id']);

            $accountId = $campaignData->account_id;

            if (! Account::where('account_id', $accountId)->exists()) {
                $adAccount = $this->getAdAccount($accountId);
                $adAccountData = $adAccount->getSelf(['name']);
                Account::firstOrCreate([
                    'account_id' => $accountId,
                ], [
                    'account_name' => $adAccountData->name,
                    'ads_type' => 'facebook',
                    'status' => 'ACTIVE',
                ]);
            }

            return [
                'id' => $campaignId,
                'account_id' => $accountId,
                'name' => $campaignData->name,
                'status' => $campaignData->status,
                'created_time' => $campaignData->created_time,
                'start_time' => $campaignData->start_time,
                'stop_time' => $campaignData->stop_time,
                'updated_time' => $campaignData->updated_time,
                'daily_budget' => $campaignData->daily_budget,
                'lifetime_budget' => $campaignData->lifetime_budget,
                'ads_type' => 'facebook',
            ];
        } catch (Exception $e) {
            $errorCode = $e->getCode();
            $errorMessage = $e->getMessage();

            // Detect permission errors per FB Marketing API error codes
            $isPermissionError = in_array($errorCode, [10, 200], true);
            $isTokenError = $errorCode === 190;

            if ($shouldWarn && ($isPermissionError || $isTokenError)) {
                $adsLinkInfo = '';
                if (! empty($adsLink)) {
                    $adsLinkInfo = "<b>Ads Link:</b> {$adsLink->link}\n";
                } elseif (! empty($adsLink->slug)) {
                    $adsLinkInfo = "<b>Slug:</b> {$adsLink->slug}\n";
                }

                $warningMessage = "⚠️ <b>Facebook Campaign Verification Issue</b>\n\n".
                    "<b>Campaign ID:</b> {$campaignId}\n".
                    $adsLinkInfo.
                    "<b>Error Code:</b> {$errorCode}\n".
                    "<b>Error Message:</b> {$errorMessage}\n\n";

                if ($isPermissionError) {
                    $warningMessage .= '<b>Action:</b> Permission issue accessing this campaign.';
                } elseif ($isTokenError) {
                    $warningMessage .= '<b>Action:</b> Token may be invalid or expired.';
                }

                SendTelegramWarningJob::dispatch(
                    $warningMessage,
                    $campaignId,
                    (string) ($context['ads_link']['id'] ?? '')
                );
            }

            Log::error('Error verifying Facebook campaign', [
                'campaign_id' => $campaignId,
                'error_code' => $errorCode,
                'error_message' => $errorMessage,
                'ads_link' => $adsLink->id ?? 'N/A',
            ]);

            return null;
        }
    }

    /**
     * Create and return an AdAccount instance.
     */
    protected function getAdAccount(string $accountId): AdAccount
    {
        if (strpos($accountId, 'act_') !== 0) {
            $accountId = 'act_'.$accountId;
        }

        return new AdAccount($accountId);
    }

    /**
     * Get campaigns for a Facebook Ads account.
     *
     * @param  string  $accountId  Facebook Ads account ID (e.g., "1234567890")
     * @param  array  $campaignIds  Optional array of campaign IDs to filter by
     */
    public function getCampaigns(string $accountId, array $campaignIds = []): ?Cursor
    {
        $adAccount = $this->getAdAccount($accountId);
        try {
            $fields = [
                'id',
                'name',
                'status',
                'created_time',
                'start_time',
                'stop_time',
                'updated_time',
                'daily_budget',
                'lifetime_budget',
            ];
            $params = [
                'effective_status' => ['ACTIVE', 'PAUSED', 'ARCHIVED'],
                'limit' => 10000,
            ];

            if (! empty($campaignIds)) {
                $params['filtering'] = [
                    [
                        'field' => 'id',
                        'operator' => 'IN',
                        'value' => $campaignIds,
                    ],
                ];
            }

            return $adAccount->getCampaigns($fields, $params);
        } catch (Exception $e) {
            Log::error('Error fetching campaigns: '.$e->getMessage().' - '.$accountId);

            return null;
        }
    }

    /**
     * Get campaign insights for an account within a time range.
     *
     * @param  string  $accountId  Facebook Ads account ID
     * @param  string  $start  Start date (YYYY-MM-DD)
     * @param  string  $end  End date (YYYY-MM-DD)
     */
    public function getCampaignInsights(string $accountId, string $start, string $end): ?array
    {
        $adAccount = $this->getAdAccount($accountId);
        $spendType = 'USD';
        try {
            $fields = [
                'campaign_id',
                'date_start',
                'date_stop',
                'impressions',
                'clicks',
                'reach',
                'spend',
                'cpc',
                'cpm',
                'ctr',
                'cost_per_action_type',
                'actions',
                'inline_link_click_ctr',
                'cost_per_inline_link_click',
                'frequency',
            ];
            $params = [
                'time_range' => [
                    'since' => $start,
                    'until' => $end,
                ],
                'level' => 'campaign',
                'limit' => 10000000,
                'time_increment' => 1,
                'campaign.effective_status' => ['ACTIVE', 'PAUSED', 'ARCHIVED'],
            ];

            $insightsCursor = $adAccount->getInsights($fields, $params);

            $campaignsInsights = [];

            foreach ($insightsCursor as $insight) {
                $actions = isset($insight->actions) && ! empty($insight->actions) ? $insight->actions : [];
                $costPerActionTypes = isset($insight->cost_per_action_type) && ! empty($insight->cost_per_action_type) ? $insight->cost_per_action_type : [];
                $campaignsInsights[] = [
                    'account_id' => $accountId,
                    'campaign_id' => $insight->campaign_id,
                    'date_start' => $insight->date_start ?? null,
                    'date_stop' => $insight->date_stop ?? null,
                    'impressions' => $insight->impressions ?? null,
                    'clicks' => $insight->clicks ?? null,
                    'reach' => $insight->reach ?? null,
                    'fb_clicks' => $this->getActionValue($actions, 'offsite_conversion.fb_pixel_lead'),
                    'cpa' => $this->getCostPerActionValue($costPerActionTypes, 'lead'),
                    'link_clicks' => $this->getActionValue($actions, 'link_click'),
                    'ctr_link' => $insight->inline_link_click_ctr ?? null,
                    'cpc_link' => $insight->cost_per_inline_link_click ?? null,
                    'article_views' => $this->getActionValue($actions, 'landing_page_view'),
                    'search_views' => $this->getActionValue($actions, 'offsite_conversion.fb_pixel_search'),
                    'spend' => $insight->spend ?? null,
                    'cpc' => $insight->cpc ?? null,
                    'cpm' => $insight->cpm ?? null,
                    'ctr' => $insight->ctr ?? null,
                    'frequency' => $insight->frequency ?? null,
                    'spend_type' => $spendType,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            return $campaignsInsights;
        } catch (Exception $e) {
            Log::error('Error fetching campaign insights: '.$e->getMessage().' - '.$accountId);

            return null;
        }
    }

    /**
     * Update campaign status.
     *
     * @param  string  $campaignId  Facebook campaign ID
     * @param  string  $status  New status ('ACTIVE' or 'PAUSED')
     */
    public function updateCampaignStatus(string $campaignId, string $status): bool
    {
        try {
            if (! in_array($status, ['ACTIVE', 'PAUSED'], true)) {
                Log::warning("FacebookAdsService: Invalid status provided for campaign update: {$status}");

                return false;
            }

            $campaign = new Campaign($campaignId);
            $campaign->setData(['status' => $status]);
            $campaign->update();

            return true;
        } catch (Exception $e) {
            Log::error('Error updating Facebook campaign status: '.$e->getMessage(), [
                'campaign_id' => $campaignId,
                'status' => $status,
                'code' => $e->getCode(),
            ]);

            return false;
        }
    }

    /**
     * Filter campaigns using insights data.
     *
     * @param  string  $accountId  Facebook Ads account ID
     * @param  array  $insights  Insights data array
     */
    public function getCampaignsFilteredByInsights(string $accountId, array $insights): ?array
    {
        $insightCampaignIds = array_unique(array_column($insights, 'campaign_id'));

        if (empty($insightCampaignIds)) {
            return [];
        }

        $campaignsCursor = $this->getCampaigns($accountId, $insightCampaignIds);

        if ($campaignsCursor === null) {
            return null;
        }

        $filteredCampaigns = [];
        foreach ($campaignsCursor as $campaign) {
            $filteredCampaigns[] = [
                'account_id' => $accountId,
                'campaign_id' => $campaign->id,
                'campaign_name' => $campaign->name,
                'daily_budget' => $campaign->daily_budget,
                'lifetime_budget' => $campaign->lifetime_budget,
                'status' => $campaign->status,
                'start_time' => Carbon::parse($campaign->start_time),
                'stop_time' => Carbon::parse($campaign->stop_time),
                'created_time' => Carbon::parse($campaign->created_time),
                'updated_time' => Carbon::parse($campaign->updated_time),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        return $filteredCampaigns;
    }

    /**
     * Extract a specific action value from the actions array.
     */
    private function getActionValue(array $actions, string $actionType): ?string
    {
        foreach ($actions as $action) {
            if (isset($action['action_type']) && $action['action_type'] === $actionType) {
                return $action['value'] ?? null;
            }
        }

        return null;
    }

    /**
     * Extract a specific cost per action value from the cost_per_action_type array.
     */
    private function getCostPerActionValue(array $costPerActionTypes, string $actionType): ?string
    {
        foreach ($costPerActionTypes as $costAction) {
            if (isset($costAction['action_type']) && $costAction['action_type'] === $actionType) {
                return $costAction['value'] ?? null;
            }
        }

        return null;
    }
}

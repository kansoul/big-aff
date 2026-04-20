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
     * Get campaign with adsets and ads in a single request using nested fields.
     *
     * @param  string  $accountId  Facebook Ads account ID
     * @param  array  $campaignIds  Campaign IDs
     * @param  string  $date  Date (YYYY-MM-DD)
     */
    public function getAccountWithAdsAndAdsets(string $accountId, array $campaignIds, string $date): ?array
    {
        try {
            $adAccount = $this->getAdAccount($accountId);
            // Define fields for adsets (same as getAdsetsFromCampaign)
            $adsetFields = [
                'name',
                'campaign_id',
                'account_id',
                'status',
                'daily_budget',
                'updated_time',
                'created_time',
                'effective_status',
            ];

            $insightsFields = [
                'account_id',
                'spend',
                'campaign_id',
                'date_start',
                'date_stop',
                'impressions',
                'clicks',
                'reach',
                'cpc',
                'cpm',
                'ctr',
                'cost_per_action_type',
                'actions',
                'inline_link_click_ctr',
                'cost_per_inline_link_click',
                'frequency',
            ];

            // Define fields for ads (same as getAdsFromCampaign)
            $adFields = [
                'name',
                'account_id',
                'campaign_id',
                'adset_id',
                'creative',
                'created_time',
                'updated_time',
                'status',
                'effective_status',
            ];

            // Build insights parameter string for both adset and ad level insights
            $insightsParamString = 'time_range({"since":"'.$date.'","until":"'.$date.'"}).time_increment(1).limit(10000000)';

            // Build fields string matching Facebook Graph API format
            $fields = array_merge($adsetFields, [
                'insights.'.$insightsParamString.'{'.implode(',', $insightsFields).'},'.
                    'ads.limit(10000000).effective_status(["ACTIVE","PAUSED","PENDING_REVIEW","DISAPPROVED","PREAPPROVED","PENDING_BILLING_INFO","CAMPAIGN_PAUSED","ARCHIVED","ADSET_PAUSED","IN_PROCESS","WITH_ISSUES"])'.
                    '{'.implode(',', $adFields).',insights.'.$insightsParamString.'{'.implode(',', $insightsFields).'}}',
            ]);
            $params = [
                'time_range' => [
                    'since' => $date,
                    'until' => $date,
                ],
                'effective_status' => ['ACTIVE', 'PAUSED', 'PENDING_REVIEW', 'DISAPPROVED', 'PREAPPROVED', 'PENDING_BILLING_INFO', 'CAMPAIGN_PAUSED', 'ARCHIVED', 'ADSET_PAUSED', 'IN_PROCESS', 'WITH_ISSUES'],
                'filtering' => [
                    [
                        'field' => 'campaign.id',
                        'operator' => 'IN',
                        'value' => $campaignIds,
                    ],
                ],
                'limit' => 10000000,
            ];

            $data = $adAccount->getAdsets($fields, $params);
            // Process adsets data
            $processedAdsets = [];
            $processedAds = [];
            if (isset($data) && is_iterable($data)) {
                foreach ($data as $adset) {
                    // Extract insights data
                    $insights = isset($adset->insights['data']) && ! empty($adset->insights['data']) ? $adset->insights['data'][0] : null;

                    // Only process if spend is greater than 0
                    if (! $insights || ! isset($insights['spend']) || floatval($insights['spend']) <= 0) {
                        continue;
                    }
                    $adsetCostPerActionTypes = isset($insights['cost_per_action_type']) && ! empty($insights['cost_per_action_type']) ? $insights['cost_per_action_type'] : [];
                    $adsetActions = isset($insights['actions']) && ! empty($insights['actions']) ? $insights['actions'] : [];
                    $processedAdsets[] = [
                        'adset_id' => $adset->id ?? null,
                        'adset_name' => $adset->name ?? null,
                        'campaign_id' => $adset->campaign_id ?? null,
                        'account_id' => $adset->account_id ?? null,
                        'status' => $adset->status ?? null,
                        'daily_budget' => $adset->daily_budget ?? null,
                        'spend' => $insights['spend'] ?? null,
                        'date_start' => $insights['date_start'] ?? null,
                        'date_stop' => $insights['date_stop'] ?? null,
                        'impressions' => $insights['impressions'] ?? null,
                        'clicks' => $insights['clicks'] ?? null,
                        'reach' => $insights['reach'] ?? null,
                        'cpc' => $insights['cpc'] ?? null,
                        'cpm' => $insights['cpm'] ?? null,
                        'ctr' => $insights['ctr'] ?? null,
                        'cpa' => $this->getCostPerActionValue($adsetCostPerActionTypes, 'lead'),
                        'link_clicks' => $this->getActionValue($adsetActions, 'link_click'),
                        'fb_clicks' => $this->getActionValue($adsetActions, 'offsite_conversion.fb_pixel_lead'),
                        'article_views' => $this->getActionValue($adsetActions, 'landing_page_view'),
                        'search_views' => $this->getActionValue($adsetActions, 'offsite_conversion.fb_pixel_search'),
                        'inline_link_click_ctr' => $insights['inline_link_click_ctr'] ?? null,
                        'cost_per_inline_link_click' => $insights['cost_per_inline_link_click'] ?? null,
                        'frequency' => $insights['frequency'] ?? null,
                        'updated_time' => $adset->updated_time ?? null,
                        'created_time' => $adset->created_time ?? null,
                        'effective_status' => $adset->effective_status ?? null,
                    ];

                    if (isset($adset->ads['data'])) {
                        foreach ($adset->ads['data'] as $ad) {
                            // Extract insights data from ad
                            $adInsights = isset($ad['insights']['data']) && ! empty($ad['insights']['data']) ? $ad['insights']['data'][0] : null;

                            // Only process if spend is greater than 0
                            if (! $adInsights || ! isset($adInsights['spend']) || floatval($adInsights['spend']) <= 0) {
                                continue;
                            }
                            $actions = isset($adInsights['actions']) && ! empty($adInsights['actions']) ? $adInsights['actions'] : [];
                            $costPerActionTypes = isset($adInsights['cost_per_action_type']) && ! empty($adInsights['cost_per_action_type']) ? $adInsights['cost_per_action_type'] : [];

                            $processedAds[] = [
                                'ad_id' => $ad['id'] ?? null,
                                'ad_name' => $ad['name'] ?? null,
                                'adset_id' => $ad['adset_id'] ?? null,
                                'campaign_id' => $ad['campaign_id'] ?? null,
                                'account_id' => $ad['account_id'] ?? null,
                                'status' => $ad['status'] ?? null,
                                'spend' => $adInsights['spend'] ?? null,
                                'date_start' => $adInsights['date_start'] ?? null,
                                'date_stop' => $adInsights['date_stop'] ?? null,
                                'impressions' => $adInsights['impressions'] ?? null,
                                'clicks' => $adInsights['clicks'] ?? null,
                                'reach' => $adInsights['reach'] ?? null,
                                'cpc' => $adInsights['cpc'] ?? null,
                                'cpm' => $adInsights['cpm'] ?? null,
                                'ctr' => $adInsights['ctr'] ?? null,
                                'cpa' => $this->getCostPerActionValue($costPerActionTypes, 'lead'),
                                'link_clicks' => $this->getActionValue($actions, 'link_click'),
                                'fb_clicks' => $this->getActionValue($actions, 'offsite_conversion.fb_pixel_lead'),
                                'article_views' => $this->getActionValue($actions, 'landing_page_view'),
                                'search_views' => $this->getActionValue($actions, 'offsite_conversion.fb_pixel_search'),
                                'inline_link_click_ctr' => $adInsights['inline_link_click_ctr'] ?? null,
                                'cost_per_inline_link_click' => $adInsights['cost_per_inline_link_click'] ?? null,
                                'frequency' => $adInsights['frequency'] ?? null,
                                'creative' => $ad['creative'] ?? null,
                                'updated_time' => $ad['updated_time'] ?? null,
                                'created_time' => $ad['created_time'] ?? null,
                                'effective_status' => $ad['effective_status'] ?? null,
                            ];
                        }
                    }
                }
            }

            return [
                'adsets' => $processedAdsets,
                'ads' => $processedAds,
            ];
        } catch (Exception $e) {
            Log::error('Error fetching campaign with adsets and ads: '.$e->getMessage().' - Account: '.$accountId);

            return null;
        }
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

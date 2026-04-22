<?php

namespace App\Services\Integrations\Facebook;

use Exception;
use FacebookAds\Api;
use FacebookAds\Object\AdAccount;
use Illuminate\Support\Facades\Log;

class FacebookAdsAdsetService
{
    protected string $accessToken;

    protected string $appSecret;

    protected string $appId;

    public function __construct()
    {
        $this->accessToken = config('facebook.facebook_ads.access_token');
        $this->appSecret = config('facebook.facebook_ads.app_secret');
        $this->appId = config('facebook.facebook_ads.app_id');
        Api::init($this->appId, $this->appSecret, $this->accessToken);
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
                        'ad_clicks' => $this->getActionValue($adsetActions, 'link_click'),
                        'article_views' => $this->getActionValue($adsetActions, 'landing_page_view'),
                        'search_views' => $this->getActionValue($adsetActions, 'offsite_conversion.fb_pixel_search'),
                        'search_click' => $this->getActionValue($adsetActions, 'offsite_conversion.fb_pixel_lead'),
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
                                'ad_clicks' => $this->getActionValue($actions, 'link_click'),
                                'article_views' => $this->getActionValue($actions, 'landing_page_view'),
                                'search_views' => $this->getActionValue($actions, 'offsite_conversion.fb_pixel_search'),
                                'search_click' => $this->getActionValue($actions, 'offsite_conversion.fb_pixel_lead'),
                                'inline_link_click_ctr' => $adInsights['inline_link_click_ctr'] ?? null,
                                'cost_per_inline_link_click' => $adInsights['cost_per_inline_link_click'] ?? null,
                                'frequency' => $adInsights['frequency'] ?? null,
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

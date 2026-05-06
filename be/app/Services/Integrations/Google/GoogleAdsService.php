<?php

namespace App\Services\Integrations\Google;

use App\Models\Account;
use Carbon\Carbon;
use Exception;
use Google\Ads\GoogleAds\Lib\V21\GoogleAdsClientBuilder;
use Google\Ads\GoogleAds\Util\FieldMasks;
use Google\Ads\GoogleAds\V21\Enums\CampaignStatusEnum\CampaignStatus;
use Google\Ads\GoogleAds\V21\Resources\Campaign;
use Google\Ads\GoogleAds\V21\Services\CampaignOperation;
use Google\Ads\GoogleAds\V21\Services\Client\GoogleAdsServiceClient;
use Google\Ads\GoogleAds\V21\Services\MutateGoogleAdsRequest;
use Google\Ads\GoogleAds\V21\Services\MutateOperation;
use Google\Ads\GoogleAds\V21\Services\SearchGoogleAdsRequest;
use Google\Auth\Credentials\UserRefreshCredentials;
use Illuminate\Support\Facades\Log;

class GoogleAdsService
{
    protected GoogleAdsServiceClient $gaService;

    public function __construct()
    {
        $cfg = config('google');

        $client = (new GoogleAdsClientBuilder)
            ->withDeveloperToken($cfg['developerToken'])
            ->withLoginCustomerId($cfg['loginCustomerId'] ?? null)
            ->withOAuth2Credential(new UserRefreshCredentials(
                ['https://www.googleapis.com/auth/adwords'],
                [
                    'client_id' => $cfg['oauth2_ads']['clientId'],
                    'client_secret' => $cfg['oauth2_ads']['clientSecret'],
                    'refresh_token' => $cfg['oauth2_ads']['refreshToken'],
                ]
            ))
            ->build();

        $this->gaService = $client->getGoogleAdsServiceClient();
    }

    /**
     * Verify if campaign exists on Google Ads and return campaign data
     */
    public function verifyCampaign(string $campaignId, array $accountIds): ?array
    {
        $gaql = "
            SELECT 
                campaign.id,
                campaign.name,
                campaign.status,
                campaign.start_date,
                campaign.end_date,
                campaign_budget.period,
                campaign_budget.amount_micros
            FROM campaign
            WHERE campaign.id = {$campaignId}
            LIMIT 1
        ";

        foreach ($accountIds as $accountId) {
            $cleanAccountId = preg_replace('/-/', '', trim($accountId));
            try {
                $searchRequest = new SearchGoogleAdsRequest([
                    'customer_id' => $cleanAccountId,
                    'query' => $gaql,
                ]);

                $response = $this->gaService->search($searchRequest);
                foreach ($response->iterateAllElements() as $row) {
                    $campaign = $row->getCampaign();
                    $budget = $row->getCampaignBudget();

                    if (! Account::where('account_id', $accountId)->exists()) {
                        $accountName = $accountId;
                        try {
                            $customerQuery = 'SELECT customer.descriptive_name FROM customer LIMIT 1';
                            $customerSearchRequest = new SearchGoogleAdsRequest([
                                'customer_id' => $cleanAccountId,
                                'query' => $customerQuery,
                            ]);
                            $customerResponse = $this->gaService->search($customerSearchRequest);
                            foreach ($customerResponse->iterateAllElements() as $customerRow) {
                                $accountName = $customerRow->getCustomer()->getDescriptiveName() ?: $accountId;
                                break;
                            }
                        } catch (Exception $e) {
                            // ignore and fallback to accountId
                        }

                        Account::firstOrCreate([
                            'account_id' => $accountId,
                        ], [
                            'account_name' => $accountName,
                            'ads_type' => 'google',
                            'status' => 'ACTIVE',
                        ]);
                    }

                    return [
                        'account_id' => $accountId,
                        'campaign_id' => (string) $campaign->getId(),
                        'ads_type' => 'google',
                        'name' => $campaign->getName(),
                        'daily_budget' => $budget->getPeriod() === 'DAILY' ? ($budget->getAmountMicros() / 1000000) : 0,
                        'lifetime_budget' => $budget->getPeriod() !== 'DAILY' ? ($budget->getAmountMicros() / 1000000) : 0,
                        'status' => $this->mapCampaignStatus($campaign->getStatus()),
                        'start_time' => Carbon::parse($campaign->getStartDate()),
                        'stop_time' => Carbon::parse($campaign->getEndDate()),
                        'created_time' => Carbon::parse($campaign->getStartDate()),
                        'updated_time' => Carbon::now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            } catch (Exception $e) {
                continue;
            }
        }

        Log::error('Error verifying Google Ads campaign', [
            'campaign_id' => $campaignId,
            'account_ids' => $accountIds,
        ]);

        return null;
    }

    /**
     * Get campaign insights for an account within a time range.
     * The output format is a flat array, similar to the Facebook service.
     */
    public function getCampaignInsights(string $accountId, string $start, string $end): ?array
    {
        $preAccountId = preg_replace('/-/', '', $accountId);
        $aggregatedInsights = [];
        $campaignsData = [];
        $vndAccountIds = json_decode(config('google.vnd_account_id'), true);
        $isVndAccount = in_array($accountId, $vndAccountIds);

        try {
            $performanceGaql = "
                SELECT 
                    campaign.id,
                    campaign.name,
                    campaign.status,
                    campaign.start_date,
                    campaign.end_date,
                    campaign_budget.period,
                    campaign_budget.amount_micros,
                    segments.date,
                    metrics.impressions,
                    metrics.clicks,
                    metrics.cost_micros,
                    metrics.ctr,
                    metrics.average_cpc
                FROM campaign
                WHERE segments.date BETWEEN '$start' AND '$end'
                AND campaign.status IN ('ENABLED', 'PAUSED', 'REMOVED')
            ";

            $performanceResponse = $this->gaService->search(new SearchGoogleAdsRequest(['customer_id' => $preAccountId, 'query' => $performanceGaql]));

            foreach ($performanceResponse->iterateAllElements() as $row) {
                $campaign = $row->getCampaign();
                $campaignId = $campaign->getId();
                $date = $row->getSegments()->getDate();
                $metrics = $row->getMetrics();
                $budget = $row->getCampaignBudget();
                $dailyKey = $campaignId.'_'.$date;

                // Process Campaign Data (Deduplicate by ID)
                if (! isset($campaignsData[$campaignId])) {
                    $campaignsData[$campaignId] = [
                        'account_id' => $accountId,
                        'campaign_id' => (string) $campaignId,
                        'ads_type' => 'google',
                        'campaign_name' => $campaign->getName(),
                        'daily_budget' => $budget->getPeriod() === 'DAILY' ? ($budget->getAmountMicros() / 1000000) : 0,
                        'lifetime_budget' => $budget->getPeriod() !== 'DAILY' ? ($budget->getAmountMicros() / 1000000) : 0,
                        'status' => $this->mapCampaignStatus($campaign->getStatus()),
                        'start_time' => Carbon::parse($campaign->getStartDate()),
                        'stop_time' => Carbon::parse($campaign->getEndDate()),
                        'created_time' => Carbon::parse($campaign->getStartDate()),
                        'updated_time' => Carbon::now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }

                $spend = ($metrics->getCostMicros() ?? 0) / 1000000;
                $cpc = ($metrics->getAverageCpc() ?? 0) / 1000000;
                $cpm = $this->calculateCpm($metrics->getCostMicros(), $metrics->getImpressions());

                if ($isVndAccount) {
                    $vndToUsdRate = getVndToUsdRate();
                    if ($vndToUsdRate > 0) {
                        $spend = $spend / $vndToUsdRate;
                        $cpc = $cpc / $vndToUsdRate;
                        $cpm = $cpm / $vndToUsdRate;
                    }
                }

                $aggregatedInsights[$dailyKey] = [
                    'account_id' => $accountId,
                    'campaign_id' => (string) $campaignId,
                    'date_start' => $date,
                    'date_stop' => $date,
                    'impressions' => $metrics->getImpressions() ?? 0,
                    'clicks' => $metrics->getClicks() ?? 0,
                    'spend' => $spend,
                    'cpc' => $cpc,
                    'cpm' => $cpm,
                    'ctr' => $metrics->getCtr() ?? 0.0,
                    'conversions' => [],
                ];
            }

            $conversionGaql = "
                SELECT 
                    campaign.id,
                    segments.date,
                    metrics.all_conversions,
                    metrics.all_conversions_value,
                    segments.conversion_action_name
                FROM campaign
                WHERE segments.date BETWEEN '$start' AND '$end'
                AND campaign.status IN ('ENABLED', 'PAUSED', 'REMOVED')
            ";

            $conversionResponse = $this->gaService->search(new SearchGoogleAdsRequest(['customer_id' => $preAccountId, 'query' => $conversionGaql]));
            foreach ($conversionResponse->iterateAllElements() as $row) {
                $campaignId = $row->getCampaign()->getId();
                $date = $row->getSegments()->getDate();
                $dailyKey = $campaignId.'_'.$date;

                if (isset($aggregatedInsights[$dailyKey])) {
                    $actionName = $row->getSegments()->getConversionActionName();
                    $allConversions = $row->getMetrics()->getAllConversions();
                    if ($actionName) {
                        $aggregatedInsights[$dailyKey]['conversions'][$actionName] = ($aggregatedInsights[$dailyKey]['conversions'][$actionName] ?? 0) + $allConversions;
                    }
                }
            }

            $finalInsights = [];
            foreach ($aggregatedInsights as $insight) {
                $conversions = $insight['conversions'];
                $insight['article_views'] = ($conversions['ArticleView'] ?? 0) + ($conversions['ArticleViewU'] ?? 0);
                $insight['search_views'] = ($conversions['SearchView'] ?? 0) + ($conversions['SearchViewU'] ?? 0);
                $insight['fb_clicks'] = ($conversions['OutboundClick'] ?? 0) + ($conversions['OutboundClickU'] ?? 0);

                $insight['reach'] = null;
                $insight['cpa'] = null;
                $insight['link_clicks'] = $insight['clicks'];
                $insight['ctr_link'] = $insight['ctr'];
                $insight['cpc_link'] = $insight['cpc'];
                $insight['frequency'] = null;
                $insight['spend_type'] = 'USD';
                $insight['created_at'] = now();
                $insight['updated_at'] = now();

                unset($insight['conversions']);
                $finalInsights[] = $insight;
            }

            return [
                'insights' => $finalInsights,
                'campaigns' => array_values($campaignsData),
            ];
        } catch (Exception $e) {
            Log::error('Error fetching Google Ads insights: '.$e->getMessage().' - '.$accountId);

            return null;
        }
    }

    /**
     * Get all campaigns for a Google Ads account.
     */
    public function getCampaigns(string $accountId): ?array
    {
        $preAccountId = preg_replace('/-/', '', $accountId);
        $gaql = "
            SELECT 
                campaign.id,
                campaign.name,
                campaign.status,
                campaign.start_date,
                campaign.end_date,
                campaign_budget.period,
                campaign_budget.amount_micros
            FROM campaign
            WHERE campaign.status IN ('ENABLED', 'PAUSED', 'REMOVED')
        ";

        try {
            $searchRequest = new SearchGoogleAdsRequest(['customer_id' => $preAccountId, 'query' => $gaql]);
            $response = $this->gaService->search($searchRequest);

            $campaigns = [];
            foreach ($response->iterateAllElements() as $row) {
                $campaign = $row->getCampaign();
                $budget = $row->getCampaignBudget();
                $campaigns[] = [
                    'account_id' => $accountId,
                    'campaign_id' => (string) $campaign->getId(),
                    'ads_type' => 'google',
                    'campaign_name' => $campaign->getName(),
                    'daily_budget' => $budget->getPeriod() === 'DAILY' ? ($budget->getAmountMicros() / 1000000) : 0,
                    'lifetime_budget' => $budget->getPeriod() !== 'DAILY' ? ($budget->getAmountMicros() / 1000000) : 0,
                    'status' => $this->mapCampaignStatus($campaign->getStatus()),
                    'start_time' => Carbon::parse($campaign->getStartDate()),
                    'stop_time' => Carbon::parse($campaign->getEndDate()),
                    'created_time' => Carbon::parse($campaign->getStartDate()),
                    'updated_time' => Carbon::now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            return $campaigns;
        } catch (Exception $e) {
            Log::error('Error fetching Google Ads campaigns: '.$e->getMessage().' - '.$accountId);

            return null;
        }
    }

    /**
     * Get campaign insights WITHOUT conversion data (reduces API calls by half).
     * Conversion fields (article_views, search_views, fb_clicks) default to 0.
     */
    public function getCampaignInsightsWithoutConversions(string $accountId, string $start, string $end): ?array
    {
        $preAccountId = preg_replace('/-/', '', $accountId);
        $aggregatedInsights = [];
        $campaignsData = [];
        $vndAccountIds = json_decode(config('google.vnd_account_id'), true);
        $isVndAccount = in_array($accountId, $vndAccountIds);

        try {
            $performanceGaql = "
                SELECT 
                    campaign.id,
                    campaign.name,
                    campaign.status,
                    campaign.start_date,
                    campaign.end_date,
                    campaign_budget.period,
                    campaign_budget.amount_micros,
                    segments.date,
                    metrics.impressions,
                    metrics.clicks,
                    metrics.cost_micros,
                    metrics.ctr,
                    metrics.average_cpc
                FROM campaign
                WHERE segments.date BETWEEN '$start' AND '$end'
                AND campaign.status IN ('ENABLED', 'PAUSED', 'REMOVED')
            ";

            $performanceResponse = $this->gaService->search(new SearchGoogleAdsRequest(['customer_id' => $preAccountId, 'query' => $performanceGaql]));

            foreach ($performanceResponse->iterateAllElements() as $row) {
                $campaign = $row->getCampaign();
                $campaignId = $campaign->getId();
                $date = $row->getSegments()->getDate();
                $metrics = $row->getMetrics();
                $budget = $row->getCampaignBudget();
                $dailyKey = $campaignId.'_'.$date;

                if (! isset($campaignsData[$campaignId])) {
                    $campaignsData[$campaignId] = [
                        'account_id' => $accountId,
                        'campaign_id' => (string) $campaignId,
                        'ads_type' => 'google',
                        'campaign_name' => $campaign->getName(),
                        'daily_budget' => $budget->getPeriod() === 'DAILY' ? ($budget->getAmountMicros() / 1000000) : 0,
                        'lifetime_budget' => $budget->getPeriod() !== 'DAILY' ? ($budget->getAmountMicros() / 1000000) : 0,
                        'status' => $this->mapCampaignStatus($campaign->getStatus()),
                        'start_time' => Carbon::parse($campaign->getStartDate()),
                        'stop_time' => Carbon::parse($campaign->getEndDate()),
                        'created_time' => Carbon::parse($campaign->getStartDate()),
                        'updated_time' => Carbon::now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }

                $spend = ($metrics->getCostMicros() ?? 0) / 1000000;
                $cpc = ($metrics->getAverageCpc() ?? 0) / 1000000;
                $cpm = $this->calculateCpm($metrics->getCostMicros(), $metrics->getImpressions());

                if ($isVndAccount) {
                    $vndToUsdRate = getVndToUsdRate();
                    if ($vndToUsdRate > 0) {
                        $spend = $spend / $vndToUsdRate;
                        $cpc = $cpc / $vndToUsdRate;
                        $cpm = $cpm / $vndToUsdRate;
                    }
                }

                $aggregatedInsights[$dailyKey] = [
                    'account_id' => $accountId,
                    'campaign_id' => (string) $campaignId,
                    'date_start' => $date,
                    'date_stop' => $date,
                    'impressions' => $metrics->getImpressions() ?? 0,
                    'clicks' => $metrics->getClicks() ?? 0,
                    'spend' => $spend,
                    'cpc' => $cpc,
                    'cpm' => $cpm,
                    'ctr' => $metrics->getCtr() ?? 0.0,
                ];
            }

            $finalInsights = [];
            foreach ($aggregatedInsights as $insight) {
                $insight['article_views'] = 0;
                $insight['search_views'] = 0;
                $insight['fb_clicks'] = 0;
                $insight['reach'] = null;
                $insight['cpa'] = null;
                $insight['link_clicks'] = $insight['clicks'];
                $insight['ctr_link'] = $insight['ctr'];
                $insight['cpc_link'] = $insight['cpc'];
                $insight['frequency'] = null;
                $insight['spend_type'] = 'USD';
                $insight['created_at'] = now();
                $insight['updated_at'] = now();

                $finalInsights[] = $insight;
            }

            return [
                'insights' => $finalInsights,
                'campaigns' => array_values($campaignsData),
            ];
        } catch (Exception $e) {
            Log::error('Error fetching Google Ads insights (without conversions): '.$e->getMessage().' - '.$accountId);

            return null;
        }
    }

    /**
     * Get conversion data for specific campaign IDs.
     * Returns array of updates keyed by campaign_id_date.
     */
    public function getConversionsForCampaigns(string $accountId, array $campaignIds, string $start, string $end): ?array
    {
        $preAccountId = preg_replace('/-/', '', $accountId);

        if (empty($campaignIds)) {
            return [];
        }

        try {
            $campaignIdList = implode(',', $campaignIds);

            $conversionGaql = "
                SELECT 
                    campaign.id,
                    segments.date,
                    metrics.all_conversions,
                    metrics.all_conversions_value,
                    segments.conversion_action_name
                FROM campaign
                WHERE segments.date BETWEEN '$start' AND '$end'
                AND campaign.status IN ('ENABLED', 'PAUSED')
                AND campaign.id IN ($campaignIdList)
            ";

            $conversionResponse = $this->gaService->search(new SearchGoogleAdsRequest(['customer_id' => $preAccountId, 'query' => $conversionGaql]));

            $aggregated = [];
            foreach ($conversionResponse->iterateAllElements() as $row) {
                $campaignId = $row->getCampaign()->getId();
                $date = $row->getSegments()->getDate();
                $dailyKey = $campaignId.'_'.$date;

                if (! isset($aggregated[$dailyKey])) {
                    $aggregated[$dailyKey] = [
                        'campaign_id' => (string) $campaignId,
                        'date' => $date,
                        'conversions' => [],
                    ];
                }

                $actionName = $row->getSegments()->getConversionActionName();
                $allConversions = $row->getMetrics()->getAllConversions();
                if ($actionName) {
                    $aggregated[$dailyKey]['conversions'][$actionName] = ($aggregated[$dailyKey]['conversions'][$actionName] ?? 0) + $allConversions;
                }
            }

            $results = [];
            foreach ($aggregated as $key => $item) {
                $conversions = $item['conversions'];
                $results[$key] = [
                    'campaign_id' => $item['campaign_id'],
                    'date' => $item['date'],
                    'article_views' => ($conversions['ArticleView'] ?? 0) + ($conversions['ArticleViewU'] ?? 0),
                    'search_views' => ($conversions['SearchView'] ?? 0) + ($conversions['SearchViewU'] ?? 0),
                    'fb_clicks' => ($conversions['OutboundClick'] ?? 0) + ($conversions['OutboundClickU'] ?? 0),
                ];
            }

            return $results;
        } catch (Exception $e) {
            Log::error('Error fetching Google Ads conversions: '.$e->getMessage().' - '.$accountId);

            return null;
        }
    }

    private function mapCampaignStatus(int $googleAdsStatus): string
    {
        return match ($googleAdsStatus) {
            CampaignStatus::ENABLED => 'ACTIVE',
            CampaignStatus::PAUSED => 'PAUSED',
            CampaignStatus::REMOVED => 'ARCHIVED',
            default => 'UNKNOWN',
        };
    }

    private function calculateCpm(?int $costMicros, ?int $impressions): ?float
    {
        if (! $costMicros || ! $impressions) {
            return 0.0;
        }
        $cost = $costMicros / 1000000;

        return ($cost / $impressions) * 1000;
    }

    /**
     * Update campaign status.
     *
     * @param  string  $accountId  Google Ads account ID
     * @param  string  $campaignId  Campaign ID to update
     * @param  string  $status  New status ('ACTIVE' or 'PAUSED')
     * @return bool Success status
     */
    public function updateCampaignStatus(string $accountId, string $campaignId, string $status): bool
    {
        $preAccountId = preg_replace('/-/', '', $accountId);

        try {
            $campaign = new Campaign;
            $campaign->setResourceName("customers/{$preAccountId}/campaigns/{$campaignId}");

            $targetStatus = match ($status) {
                'ACTIVE' => CampaignStatus::ENABLED,
                'PAUSED' => CampaignStatus::PAUSED,
                default => null,
            };

            if ($targetStatus === null) {
                Log::warning("GoogleAdsService: Invalid status provided for campaign update: {$status}");

                return false;
            }

            $campaign->setStatus($targetStatus);

            $campaignOperation = new CampaignOperation;
            $campaignOperation->setUpdate($campaign);
            $campaignOperation->setUpdateMask(FieldMasks::allSetFieldsOf($campaign));

            $mutateOperation = new MutateOperation;
            $mutateOperation->setCampaignOperation($campaignOperation);

            $this->gaService->mutate(
                new MutateGoogleAdsRequest([
                    'customer_id' => $preAccountId,
                    'mutate_operations' => [$mutateOperation],
                ])
            );

            return true;
        } catch (Exception $e) {
            Log::error('Error updating Google Ads campaign status: '.$e->getMessage().' - Account: '.$accountId.' - Campaign: '.$campaignId);

            return false;
        }
    }
}

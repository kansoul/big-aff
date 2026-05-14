<?php

namespace App\Services\Integrations\Adx;

use Carbon\Carbon;
use Exception;
use Google\Ads\GoogleAds\Lib\V21\GoogleAdsClientBuilder;
use Google\Ads\GoogleAds\V21\Enums\CampaignStatusEnum\CampaignStatus;
use Google\Ads\GoogleAds\V21\Services\Client\GoogleAdsServiceClient;
use Google\Ads\GoogleAds\V21\Services\SearchGoogleAdsRequest;
use Google\Auth\Credentials\UserRefreshCredentials;
use Illuminate\Support\Facades\Log;

class AdxGoogleAdsService
{
    private const CONVERSION_ACTION_FIELD_MAP = [
        'LandingViewU' => 'landing_view',
        'GetGameLinkClickU' => 'get_game_link_click',
        'DetailViewU' => 'detail_view',
        'GetBonusClickU' => 'get_bonus_click',
    ];

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
     * Get campaign insights for an ADX account within a time range.
     *
     * @return array{insights: list<array<string, mixed>>, campaigns: list<array<string, mixed>>}|null
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

            $performanceResponse = $this->gaService->search(new SearchGoogleAdsRequest([
                'customer_id' => $preAccountId,
                'query' => $performanceGaql,
            ]));

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
                        'campaign_name' => $campaign->getName(),
                        'daily_budget' => $budget->getPeriod() === 'DAILY' ? ($budget->getAmountMicros() / 1000000) : 0,
                        'lifetime_budget' => $budget->getPeriod() !== 'DAILY' ? ($budget->getAmountMicros() / 1000000) : 0,
                        'status' => $this->mapCampaignStatus($campaign->getStatus()),
                        'start_time' => Carbon::parse($campaign->getStartDate()),
                        'stop_time' => Carbon::parse($campaign->getEndDate()),
                        'created_time' => Carbon::parse($campaign->getStartDate()),
                        'updated_time' => Carbon::now(),
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
                    segments.conversion_action_name
                FROM campaign
                WHERE segments.date BETWEEN '$start' AND '$end'
                AND campaign.status IN ('ENABLED', 'PAUSED', 'REMOVED')
            ";

            $conversionResponse = $this->gaService->search(new SearchGoogleAdsRequest([
                'customer_id' => $preAccountId,
                'query' => $conversionGaql,
            ]));

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
                foreach (self::CONVERSION_ACTION_FIELD_MAP as $actionName => $field) {
                    $insight[$field] = (float) ($conversions[$actionName] ?? 0);
                }
                $insight['spend_type'] = 'USD';

                unset($insight['conversions']);
                $finalInsights[] = $insight;
            }

            return [
                'insights' => $finalInsights,
                'campaigns' => array_values($campaignsData),
            ];
        } catch (Exception $e) {
            Log::channel('sync_reports')->error('[AdxGoogleAds] getCampaignInsights failed', [
                'account_id' => $accountId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Get all campaigns for an account regardless of activity (no date filter).
     *
     * @return list<array<string, mixed>>|null
     */
    public function getCampaigns(string $accountId): ?array
    {
        $preAccountId = preg_replace('/-/', '', $accountId);

        try {
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

            $response = $this->gaService->search(new SearchGoogleAdsRequest([
                'customer_id' => $preAccountId,
                'query' => $gaql,
            ]));

            $campaigns = [];

            foreach ($response->iterateAllElements() as $row) {
                $campaign = $row->getCampaign();
                $budget = $row->getCampaignBudget();

                $campaigns[] = [
                    'account_id' => $accountId,
                    'campaign_id' => (string) $campaign->getId(),
                    'campaign_name' => $campaign->getName(),
                    'daily_budget' => $budget->getPeriod() === 'DAILY' ? ($budget->getAmountMicros() / 1000000) : 0,
                    'lifetime_budget' => $budget->getPeriod() !== 'DAILY' ? ($budget->getAmountMicros() / 1000000) : 0,
                    'status' => $this->mapCampaignStatus($campaign->getStatus()),
                    'start_time' => Carbon::parse($campaign->getStartDate()),
                    'stop_time' => Carbon::parse($campaign->getEndDate()),
                    'created_time' => Carbon::parse($campaign->getStartDate()),
                    'updated_time' => Carbon::now(),
                ];
            }

            return $campaigns;
        } catch (Exception $e) {
            Log::channel('sync_reports')->error('[AdxGoogleAds] getCampaigns failed', [
                'account_id' => $accountId,
                'error' => $e->getMessage(),
            ]);

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

    private function calculateCpm(?int $costMicros, ?int $impressions): float
    {
        if (! $costMicros || ! $impressions) {
            return 0.0;
        }

        return (($costMicros / 1000000) / $impressions) * 1000;
    }
}

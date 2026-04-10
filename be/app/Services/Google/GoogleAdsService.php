<?php

namespace App\Services\Google;

use App\Models\Campaign;
use Exception;
use Google\Ads\GoogleAds\Lib\V21\GoogleAdsClient;
use Google\Ads\GoogleAds\Lib\V21\GoogleAdsClientBuilder;
use Google\Ads\GoogleAds\V21\Services\Client\GoogleAdsServiceClient;
use Google\Ads\GoogleAds\V21\Services\SearchGoogleAdsRequest;
use Google\Auth\Credentials\UserRefreshCredentials;
use Illuminate\Support\Facades\Log;

class GoogleAdsService
{
    protected GoogleAdsServiceClient $gaService;

    protected GoogleAdsClient $googleAdsClient;

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

        $this->googleAdsClient = $client;
        $this->gaService = $client->getGoogleAdsServiceClient();
    }

    /**
     * Verify if campaign exists on Google Ads and return campaign data
     */
    public function verifyCampaign(string $campaignId, array $accountIds): ?array
    {
        $isCampaignRegex = ctype_digit((string) $campaignId);
        if (! $isCampaignRegex || strlen($campaignId) < 10) {
            return null;
        }

        $gaql = "
            SELECT campaign.id, campaign.name, campaign.status
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
                    return [
                        'account_id' => $accountId,
                        'id' => $row->getCampaign()->getId(),
                        'name' => $row->getCampaign()->getName(),
                        'status' => $row->getCampaign()->getStatus(),
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
}

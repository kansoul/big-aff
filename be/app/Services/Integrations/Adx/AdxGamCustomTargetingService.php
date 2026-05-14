<?php

namespace App\Services\Integrations\Adx;

use App\Services\Integrations\Google\GamSoapClientFactory;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use SoapClient;
use SoapFault;
use Throwable;

/**
 * Ensures GAM custom targeting key/value pairs exist for ADX campaigns.
 * Uses the key "campid" with the campaign ID as the value.
 */
class AdxGamCustomTargetingService
{
    private const KEY_NAME = 'campid';

    private const KEY_TYPE = 'PREDEFINED';

    private SoapClient $client;

    public function __construct(GamSoapClientFactory $gamFactory)
    {
        $version = $gamFactory->apiVersion();
        $this->client = $gamFactory->make(
            "https://ads.google.com/apis/ads/publisher/{$version}/CustomTargetingService?wsdl"
        );
    }

    /**
     * Ensure that the GAM custom targeting key "campid" and a value for the given
     * campaign ID both exist.
     *
     * @return array{key_id: int, key_name: string, value_id: int, value_name: string}|null
     */
    public function ensureCampaignTargeting(string $campaignId): ?array
    {
        try {
            $keyId = $this->getOrCreateKey();
            $valueId = $this->getOrCreateValue($keyId, $campaignId);

            return [
                'key_id' => $keyId,
                'key_name' => self::KEY_NAME,
                'value_id' => $valueId,
                'value_name' => $campaignId,
            ];
        } catch (Throwable $e) {
            Log::channel('sync_reports')->error('[AdxGamCustomTargeting] Failed to ensure targeting', [
                'campaign_id' => $campaignId,
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private function getOrCreateKey(): int
    {
        $existing = $this->findKey(self::KEY_NAME);
        if ($existing !== null) {
            return $existing;
        }

        return $this->createKey(self::KEY_NAME);
    }

    private function findKey(string $name): ?int
    {
        try {
            $escapedName = $this->escapeStatementString($name);
            $response = $this->client->__soapCall('getCustomTargetingKeysByStatement', [[
                'filterStatement' => [
                    'query' => "WHERE name = '{$escapedName}' LIMIT 1",
                ],
            ]]);

            $results = $response->rval->results ?? null;
            if (empty($results)) {
                return null;
            }

            $key = is_array($results) ? $results[0] : $results;

            return isset($key->id) ? (int) $key->id : null;
        } catch (SoapFault $fault) {
            throw new RuntimeException('GAM getCustomTargetingKeysByStatement failed: '.$fault->getMessage(), previous: $fault);
        }
    }

    private function createKey(string $name): int
    {
        try {
            $response = $this->client->__soapCall('createCustomTargetingKeys', [[
                'keys' => [
                    [
                        'name' => $name,
                        'displayName' => $name,
                        'type' => self::KEY_TYPE,
                    ],
                ],
            ]]);

            $created = $response->rval ?? null;
            $key = is_array($created) ? $created[0] : $created;

            if (! isset($key->id)) {
                throw new RuntimeException('GAM createCustomTargetingKeys did not return a key ID.');
            }

            return (int) $key->id;
        } catch (SoapFault $fault) {
            throw new RuntimeException('GAM createCustomTargetingKeys failed: '.$fault->getMessage(), previous: $fault);
        }
    }

    private function getOrCreateValue(int $keyId, string $campaignId): int
    {
        $existing = $this->findValue($keyId, $campaignId);
        if ($existing !== null) {
            return $existing;
        }

        return $this->createValue($keyId, $campaignId);
    }

    private function findValue(int $keyId, string $campaignId): ?int
    {
        try {
            $escapedCampaignId = $this->escapeStatementString($campaignId);
            $response = $this->client->__soapCall('getCustomTargetingValuesByStatement', [[
                'filterStatement' => [
                    'query' => "WHERE customTargetingKeyId = {$keyId} AND name = '{$escapedCampaignId}' LIMIT 1",
                ],
            ]]);

            $results = $response->rval->results ?? null;
            if (empty($results)) {
                return null;
            }

            $value = is_array($results) ? $results[0] : $results;

            return isset($value->id) ? (int) $value->id : null;
        } catch (SoapFault $fault) {
            throw new RuntimeException('GAM getCustomTargetingValuesByStatement failed: '.$fault->getMessage(), previous: $fault);
        }
    }

    private function createValue(int $keyId, string $campaignId): int
    {
        try {
            $response = $this->client->__soapCall('createCustomTargetingValues', [[
                'values' => [
                    [
                        'customTargetingKeyId' => $keyId,
                        'name' => $campaignId,
                        'displayName' => $campaignId,
                        'matchType' => 'EXACT',
                    ],
                ],
            ]]);

            $created = $response->rval ?? null;
            $value = is_array($created) ? $created[0] : $created;

            if (! isset($value->id)) {
                throw new RuntimeException('GAM createCustomTargetingValues did not return a value ID.');
            }

            return (int) $value->id;
        } catch (SoapFault $fault) {
            throw new RuntimeException('GAM createCustomTargetingValues failed: '.$fault->getMessage(), previous: $fault);
        }
    }

    private function escapeStatementString(string $value): string
    {
        return str_replace("'", "\\'", $value);
    }
}

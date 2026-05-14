<?php

namespace App\Services\Integrations\Adx;

use Exception;
use Google\Ads\GoogleAds\Lib\V21\GoogleAdsClient;
use Google\Ads\GoogleAds\Lib\V21\GoogleAdsClientBuilder;
use Google\Ads\GoogleAds\V21\Errors\ConversionUploadErrorEnum\ConversionUploadError;
use Google\Ads\GoogleAds\V21\Errors\GoogleAdsFailure;
use Google\Ads\GoogleAds\V21\Services\ClickConversion;
use Google\Ads\GoogleAds\V21\Services\UploadClickConversionsRequest;
use Google\Auth\Credentials\UserRefreshCredentials;
use Illuminate\Support\Facades\Log;

class AdxConversionSyncService
{
    protected GoogleAdsClient $googleAdsClient;

    public function __construct()
    {
        $this->googleAdsClient = $this->buildGoogleAdsClient();
    }

    /**
     * @param  array<int, array<string, mixed>>  $conversionsPayload
     * @return array<int>|null Returns failed indices, empty array if all success, null if critical error.
     */
    public function syncAdxConversion(string|int $customerId, array $conversionsPayload): ?array
    {
        try {
            if (empty($conversionsPayload)) {
                return [];
            }

            if (! $customerId) {
                Log::channel('sync_reports')->error('[AdxConversionSync] Missing customer_id');

                return null;
            }

            $preAccountId = preg_replace('/-/', '', (string) $customerId);
            $uploadService = $this->googleAdsClient->getConversionUploadServiceClient();
            $clickConversions = [];

            foreach ($conversionsPayload as $payload) {
                $conversion = new ClickConversion;

                if (! empty($payload['gclid'])) {
                    $conversion->setGclid($payload['gclid']);
                } elseif (! empty($payload['wbraid'])) {
                    $conversion->setWbraid($payload['wbraid']);
                } elseif (! empty($payload['gbraid'])) {
                    $conversion->setGbraid($payload['gbraid']);
                }

                $conversion->setConversionAction($payload['conversion_action_resource_name']);

                if (! empty($payload['conversion_value'])) {
                    $conversion->setConversionValue((float) $payload['conversion_value']);
                }

                if (! empty($payload['currency_code'])) {
                    $conversion->setCurrencyCode($payload['currency_code']);
                }

                $conversion->setConversionDateTime($payload['conversion_date_time']);
                $clickConversions[] = $conversion;
            }

            $request = new UploadClickConversionsRequest([
                'customer_id' => $preAccountId,
                'conversions' => $clickConversions,
                'partial_failure' => true,
            ]);

            $response = $uploadService->uploadClickConversions($request);

            return $this->resolveFailedIndices($response, (string) $customerId);
        } catch (Exception $e) {
            Log::channel('sync_reports')->error('[AdxConversionSync] Upload failed: '.$e->getMessage());

            return null;
        }
    }

    private function resolveFailedIndices(mixed $response, string $accountId): array
    {
        $failedIndices = [];

        if (! $response->hasPartialFailureError()) {
            return $failedIndices;
        }

        $partialFailure = $response->getPartialFailureError();

        foreach ($partialFailure->getDetails() as $detail) {
            if ($detail->getTypeUrl() !== 'type.googleapis.com/google.ads.googleads.v21.errors.GoogleAdsFailure') {
                continue;
            }

            $failure = new GoogleAdsFailure;
            $failure->mergeFromString($detail->getValue());

            foreach ($failure->getErrors() as $error) {
                $index = null;
                if ($error->hasLocation()) {
                    foreach ($error->getLocation()->getFieldPathElements() as $element) {
                        if ($element->getFieldName() === 'conversions' && $element->hasIndex()) {
                            $index = $element->getIndex();
                            break;
                        }
                    }
                }

                $errorCode = $error->getErrorCode()->getConversionUploadError();

                switch ($errorCode) {
                    // Silently skip — these are expected non-actionable states
                    case ConversionUploadError::CLICK_CONVERSION_ALREADY_EXISTS:
                    case ConversionUploadError::EXPIRED_EVENT:
                    case ConversionUploadError::UNPARSEABLE_GCLID:
                        break;

                    default:
                        Log::channel('sync_reports')->warning('[AdxConversionSync] Upload error', [
                            'account_id' => $accountId,
                            'index' => $index,
                            'error' => $error->getMessage(),
                        ]);
                        if (! is_null($index)) {
                            $failedIndices[] = $index;
                        }
                        break;
                }
            }
        }

        return array_unique($failedIndices);
    }

    private function buildGoogleAdsClient(): GoogleAdsClient
    {
        $cfg = config('google');
        $oauth2 = $cfg['oauth2_ads_conversion'];

        return (new GoogleAdsClientBuilder)
            ->withDeveloperToken($oauth2['developerToken'])
            ->withLoginCustomerId($oauth2['loginCustomerId'] ?? null)
            ->withOAuth2Credential(new UserRefreshCredentials(
                ['https://www.googleapis.com/auth/adwords'],
                [
                    'client_id' => $oauth2['clientId'],
                    'client_secret' => $oauth2['clientSecret'],
                    'refresh_token' => $oauth2['refreshToken'],
                ]
            ))
            ->build();
    }
}

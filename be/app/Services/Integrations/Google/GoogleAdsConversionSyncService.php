<?php

namespace App\Services\Integrations\Google;

use Exception;
use Google\Ads\GoogleAds\Lib\V21\GoogleAdsClient;
use Google\Ads\GoogleAds\Lib\V21\GoogleAdsClientBuilder;
use Google\Ads\GoogleAds\V21\Errors\ConversionUploadErrorEnum\ConversionUploadError;
use Google\Ads\GoogleAds\V21\Errors\GoogleAdsFailure;
use Google\Ads\GoogleAds\V21\Services\ClickConversion;
use Google\Ads\GoogleAds\V21\Services\UploadClickConversionsRequest;
use Google\Auth\Credentials\UserRefreshCredentials;
use Illuminate\Support\Facades\Log;

class GoogleAdsConversionSyncService
{
    protected GoogleAdsClient $googleAdsClient;

    public function __construct()
    {
        $cfg = config('google');
        $oauth2 = $cfg['oauth2_ads_conversion'];

        $this->googleAdsClient = (new GoogleAdsClientBuilder)
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

    /**
     * Sync ad revenue to Google Ads.
     *
     * @return array<int>|null Returns failed indices, empty array if all success, null if critical error.
     */
    public function syncAdsConversion(string|int $customerId, array $adRevenues): ?array
    {
        try {
            if (empty($adRevenues)) {
                return [];
            }

            if (! $customerId) {
                Log::error('Missing customer_id in Ad Revenue sync data');

                return null;
            }

            $preAccountId = preg_replace('/-/', '', $customerId);
            $conversionUploadService = $this->googleAdsClient->getConversionUploadServiceClient();
            $conversions = [];

            foreach ($adRevenues as $adRevenue) {
                $conversion = new ClickConversion;
                if (! empty($adRevenue['gclid'])) {
                    $conversion->setGclid($adRevenue['gclid']);
                } elseif (! empty($adRevenue['wbraid'])) {
                    $conversion->setWbraid($adRevenue['wbraid']);
                } elseif (! empty($adRevenue['gbraid'])) {
                    $conversion->setGbraid($adRevenue['gbraid']);
                }

                $conversion->setConversionAction($adRevenue['conversion_action_resource_name']);
                if ($adRevenue['conversion_value']) {
                    $conversion->setConversionValue($adRevenue['conversion_value'] / 1000000);
                }
                if ($adRevenue['currency_code']) {
                    $conversion->setCurrencyCode($adRevenue['currency_code']);
                }
                $conversion->setConversionDateTime($adRevenue['conversion_date_time']);
                $conversions[] = $conversion;
            }

            $request = new UploadClickConversionsRequest([
                'customer_id' => $preAccountId,
                'conversions' => $conversions,
                'partial_failure' => true,
            ]);

            $response = $conversionUploadService->uploadClickConversions($request);
            $failedIndices = [];

            if ($response->hasPartialFailureError()) {
                $partialFailure = $response->getPartialFailureError();

                foreach ($partialFailure->getDetails() as $detail) {
                    if ($detail->getTypeUrl() === 'type.googleapis.com/google.ads.googleads.v21.errors.GoogleAdsFailure') {
                        $googleAdsFailure = new GoogleAdsFailure;
                        $googleAdsFailure->mergeFromString($detail->getValue());

                        foreach ($googleAdsFailure->getErrors() as $error) {
                            $index = null;
                            if ($error->hasLocation()) {
                                foreach ($error->getLocation()->getFieldPathElements() as $pathElement) {
                                    if ($pathElement->getFieldName() === 'conversions' && $pathElement->hasIndex()) {
                                        $index = $pathElement->getIndex();
                                        break;
                                    }
                                }
                            }

                            $gclid = 'unknown';

                            if (! is_null($index) && isset($conversions[$index])) {
                                $failedRecord = $conversions[$index];
                                $gclid = $failedRecord->getGclid();
                            }

                            $errorCode = $error->getErrorCode()->getConversionUploadError();
                            $errorMessage = $error->getMessage();

                            switch ($errorCode) {
                                case ConversionUploadError::CLICK_CONVERSION_ALREADY_EXISTS:
                                case ConversionUploadError::EXPIRED_EVENT:
                                case ConversionUploadError::UNPARSEABLE_GCLID:
                                    break;

                                case ConversionUploadError::CONVERSION_PRECEDES_EVENT:
                                case ConversionUploadError::EVENT_NOT_FOUND:
                                case ConversionUploadError::TOO_RECENT_EVENT:
                                    if (! is_null($index)) {
                                        $failedIndices[] = $index;
                                    }
                                    break;

                                default:
                                    Log::error("Unhandled UploadError for account {$customerId} [Index: {$index}] GCLID {$gclid}: {$errorMessage}");
                                    if (! is_null($index)) {
                                        $failedIndices[] = $index;
                                    }
                                    break;
                            }
                        }
                    }
                }
            }

            return array_unique($failedIndices);
        } catch (Exception $e) {
            Log::error('Error syncing Ad Revenue to Google Ads: '.$e->getMessage());

            return null;
        }
    }
}

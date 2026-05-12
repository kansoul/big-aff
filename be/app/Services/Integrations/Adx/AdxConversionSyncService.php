<?php

namespace App\Services\Integrations\Adx;

use App\Models\AdxAccountConversion;
use App\Models\AdxConversion;
use App\Models\AdxConversionUpload;
use Exception;
use Google\Ads\GoogleAds\Lib\V21\GoogleAdsClient;
use Google\Ads\GoogleAds\Lib\V21\GoogleAdsClientBuilder;
use Google\Ads\GoogleAds\V21\Errors\ConversionUploadErrorEnum\ConversionUploadError;
use Google\Ads\GoogleAds\V21\Errors\GoogleAdsFailure;
use Google\Ads\GoogleAds\V21\Services\ClickConversion;
use Google\Ads\GoogleAds\V21\Services\UploadClickConversionsRequest;
use Google\Auth\Credentials\UserRefreshCredentials;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AdxConversionSyncService
{
    private const BATCH_SIZE = 100;

    public function sync(): int
    {
        $synced = 0;

        $pending = AdxConversion::query()
            ->where('sync_status', 'pending')
            ->where('source', 'google')
            ->whereNotNull('account_id')
            ->whereNotNull('conversion_action_id')
            ->where(fn ($q) => $q->whereNotNull('gclid')->orWhereNotNull('gbraid')->orWhereNotNull('wbraid'))
            ->orderBy('occurred_at')
            ->get();

        if ($pending->isEmpty()) {
            return 0;
        }

        $byAccount = $pending->groupBy('account_id');

        foreach ($byAccount as $accountId => $conversions) {
            try {
                $synced += $this->syncAccountConversions((string) $accountId, $conversions);
            } catch (Exception $e) {
                Log::channel('sync_reports')->error('[AdxConversionSync] Account batch failed', [
                    'account_id' => $accountId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $synced;
    }

    /**
     * @param  Collection<int, AdxConversion>  $conversions
     */
    private function syncAccountConversions(string $accountId, Collection $conversions): int
    {
        $accountConversions = AdxAccountConversion::query()
            ->where('source', 'google')
            ->where('account_id', $accountId)
            ->where('status', 'active')
            ->get()
            ->keyBy('conversion_type');

        $client = $this->buildGoogleAdsClient();
        $uploadService = $client->getConversionUploadServiceClient();
        $preAccountId = preg_replace('/-/', '', $accountId);
        $synced = 0;

        foreach ($conversions->chunk(self::BATCH_SIZE) as $chunk) {
            $indexed = $chunk->values();
            $clickConversions = [];

            foreach ($indexed as $conversion) {
                $accountConversion = $accountConversions->get($conversion->conversion_type);

                $conversionActionId = $conversion->conversion_action_id
                    ?? $accountConversion?->conversion_action_id;

                if (! $conversionActionId) {
                    $this->markFailed($conversion, 'no_action', 'No conversion_action_id resolved.');

                    continue;
                }

                $resourceName = "customers/{$preAccountId}/conversionActions/{$conversionActionId}";

                $click = new ClickConversion;
                if (! empty($conversion->gclid)) {
                    $click->setGclid($conversion->gclid);
                } elseif (! empty($conversion->wbraid)) {
                    $click->setWbraid($conversion->wbraid);
                } elseif (! empty($conversion->gbraid)) {
                    $click->setGbraid($conversion->gbraid);
                }

                $click->setConversionAction($resourceName);
                $click->setConversionDateTime($conversion->occurred_at->format('Y-m-d H:i:sP'));

                if ($conversion->conversion_value > 0) {
                    $click->setConversionValue((float) $conversion->conversion_value);
                }
                if ($conversion->currency) {
                    $click->setCurrencyCode($conversion->currency);
                }

                $clickConversions[] = [
                    'conversion' => $click,
                    'model' => $conversion,
                    'action_id' => $conversionActionId,
                    'resource_name' => $resourceName,
                ];
            }

            if (empty($clickConversions)) {
                continue;
            }

            try {
                $request = new UploadClickConversionsRequest([
                    'customer_id' => $preAccountId,
                    'conversions' => array_column($clickConversions, 'conversion'),
                    'partial_failure' => true,
                ]);

                $response = $uploadService->uploadClickConversions($request);
                $failedIndices = $this->resolveFailedIndices($response, $accountId);

                DB::transaction(function () use ($clickConversions, $failedIndices, &$synced): void {
                    $now = now();

                    foreach ($clickConversions as $i => $item) {
                        /** @var AdxConversion $model */
                        $model = $item['model'];

                        if (in_array($i, $failedIndices, true)) {
                            continue;
                        }

                        $model->update([
                            'sync_status' => 'synced',
                            'synced_at' => $now,
                            'error_message' => null,
                        ]);

                        AdxConversionUpload::create([
                            'adx_conversion_id' => $model->id,
                            'upload_status' => 'success',
                            'external_conversion_action' => $item['resource_name'],
                            'uploaded_at' => $now,
                        ]);

                        $synced++;
                    }

                    foreach ($failedIndices as $i) {
                        if (! isset($clickConversions[$i])) {
                            continue;
                        }
                        $model = $clickConversions[$i]['model'];
                        $model->update([
                            'sync_status' => 'failed',
                            'error_message' => 'Partial failure from Google Ads API.',
                        ]);

                        AdxConversionUpload::create([
                            'adx_conversion_id' => $model->id,
                            'upload_status' => 'failed',
                            'external_conversion_action' => $clickConversions[$i]['resource_name'],
                            'error_message' => 'Partial failure from Google Ads API.',
                            'uploaded_at' => now(),
                        ]);
                    }
                });
            } catch (Exception $e) {
                Log::channel('sync_reports')->error('[AdxConversionSync] Upload batch failed', [
                    'account_id' => $accountId,
                    'error' => $e->getMessage(),
                ]);

                foreach ($clickConversions as $item) {
                    $this->markFailed($item['model'], 'exception', $e->getMessage());
                }
            }
        }

        return $synced;
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
                foreach ($error->getLocation()->getFieldPathElements() as $element) {
                    if ($element->getFieldName() === 'conversions' && $element->hasIndex()) {
                        $index = $element->getIndex();
                        break;
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

    private function markFailed(AdxConversion $conversion, string $code, string $message): void
    {
        $conversion->update([
            'sync_status' => 'failed',
            'error_message' => "[{$code}] {$message}",
        ]);
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

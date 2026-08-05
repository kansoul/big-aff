<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Tracking\StoreAdsConversionRequest;
use App\Http\Requests\Tracking\StorePixelConversionRequest;
use App\Http\Requests\Tracking\StoreTrackingLogRequest;
use App\Services\Tracking\TrackingService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class TrackingController extends BaseController
{
    public function __construct(
        protected TrackingService $trackingService,
    ) {}

    /**
     * Store a tracking log entry.
     * Always returns HTTP 200; errors use success: false.
     */
    public function storeLog(StoreTrackingLogRequest $request): JsonResponse
    {
        try {
            $sessionId = $this->trackingService->handleLog($request->validated());

            return $this->sendResponse([
                'success' => true,
                'session_id' => $sessionId,
            ]);
        } catch (Exception $e) {
            Log::error('Failed to store tracking log', [
                'error' => $e->getMessage(),
                'data' => $request->safe()->all(),
            ]);

            return $this->sendResponse([
                'success' => false,
                'session_id' => null,
            ]);
        }
    }

    public function config(string $trackingCode): JsonResponse
    {
        return $this->sendResponse([
            'data' => $this->trackingService->config($trackingCode),
        ]);
    }

    /**
     * Store ads conversion
     *
     * @bodyParam account_id string required Account ID.
     * @bodyParam campaign_id string required_without:conversion_value Campaign ID used to resolve channel RPC.
     * @bodyParam gclid string required GCLID.
     * @bodyParam wbraid string required WBRAID.
     * @bodyParam gbraid string required GBRAID.
     * @bodyParam conversion_action_resource_name string required Conversion action resource name.
     * @bodyParam conversion_value float required_without:campaign_id Conversion value in USD.
     * @bodyParam currency_code string required Conversion currency.
     */
    public function storeAdsConversion(StoreAdsConversionRequest $request): JsonResponse
    {
        try {
            $this->trackingService->storeAdsConversion($request->validated());

            return $this->sendResponse([
                'success' => true,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to store ads conversion', [
                'error' => $e->getMessage(),
                'data' => $request->safe()->all(),
            ]);

            return $this->sendResponse([
                'success' => false,
            ]);
        }
    }

    /**
     * Store a pixel conversion and fire the upstream postback.
     *
     * @bodyParam tracking_code string required Ads link tracking code.
     * @bodyParam platform string Pixel platform: tiktok or meta. Defaults to tiktok.
     * @bodyParam advertiser_id string Advertiser ID. Falls back to the ads link tracking IDs.
     * @bodyParam pixel_id string Pixel ID the conversion was pushed to. Falls back to the ads link pixel.
     * @bodyParam event_name string Pixel event name, e.g. CompletePayment.
     * @bodyParam event_id string Pixel event ID used for deduplication upstream.
     * @bodyParam session_id string Tracking session ID.
     * @bodyParam campaign_id string Campaign ID.
     * @bodyParam adset_id string Adset ID.
     * @bodyParam ad_id string Ad ID.
     * @bodyParam click_id string Click ID (ttclid / fbclid).
     * @bodyParam conversion_value float Conversion value.
     * @bodyParam currency_code string Conversion currency.
     * @bodyParam payload object Extra event properties.
     */
    public function storePixelConversion(StorePixelConversionRequest $request): JsonResponse
    {
        try {
            $this->trackingService->storePixelConversion($request->validated());

            return $this->sendResponse([
                'success' => true,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to store pixel conversion', [
                'error' => $e->getMessage(),
                'data' => $request->safe()->all(),
            ]);

            return $this->sendResponse([
                'success' => false,
            ]);
        }
    }
}

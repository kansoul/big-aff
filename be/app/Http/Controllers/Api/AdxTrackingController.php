<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Adx\Tracking\StoreAdxEventRequest;
use App\Services\Adx\AdxTrackingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * @tags AdX Tracking
 */
class AdxTrackingController extends BaseController
{
    public function __construct(
        private readonly AdxTrackingService $service,
    ) {}

    public function storeEvent(StoreAdxEventRequest $request): JsonResponse
    {
        try {
            $result = $this->service->storeEvent($request->validated());

            return $this->sendResponse([
                'success' => true,
                ...$result,
            ]);
        } catch (Throwable $e) {
            Log::error('Failed to store AdX funnel event', [
                'error' => $e->getMessage(),
                'data' => $request->safe()->except(['gclid', 'gbraid', 'wbraid']),
            ]);

            return $this->sendResponse(['success' => false], 200);
        }
    }
}

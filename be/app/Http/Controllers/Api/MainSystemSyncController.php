<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\MainSystem\ReceiveInsightReportsRequest;
use App\Services\MainSystem\MainSystemSyncService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags Main System Sync
 */
class MainSystemSyncController extends BaseController
{
    public function __construct(
        private readonly MainSystemSyncService $mainSystemSyncService,
    ) {}

    public function receiveInsightReports(ReceiveInsightReportsRequest $request): JsonResponse
    {
        $this->mainSystemSyncService->receiveInsightReports(
            $request->validated(),
            $request->bearerToken(),
        );

        return $this->sendResponse(['message' => 'Insight payload accepted.'], Response::HTTP_ACCEPTED);
    }
}

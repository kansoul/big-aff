<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\MainSystem\ReceiveChannelsRequest;
use App\Http\Requests\MainSystem\ReceiveInsightReportsRequest;
use App\Services\MainSystem\MainSystemSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
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
        $payload = $request->validated();

        Log::channel('sync_reports')->info('[MainSystemSync][Controller] Insight request reached controller', [
            'main_team_id' => $payload['main_team_id'] ?? null,
            'has_bearer_token' => filled($request->bearerToken()),
            'accounts_count' => count($payload['accounts'] ?? []),
            'campaigns_count' => count($payload['campaigns'] ?? []),
            'insights_count' => count($payload['insights'] ?? []),
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $this->mainSystemSyncService->receiveInsightReports(
            $payload,
            $request->bearerToken(),
        );

        return $this->sendResponse(['message' => 'Insight payload accepted.'], Response::HTTP_ACCEPTED);
    }

    public function receiveChannels(ReceiveChannelsRequest $request): JsonResponse
    {
        $payload = $request->validated();

        Log::channel('sync_reports')->info('[MainSystemSync][Controller] Channel request reached controller', [
            'main_team_id' => $payload['main_team_id'] ?? null,
            'has_bearer_token' => filled($request->bearerToken()),
            'channels_count' => count($payload['channels'] ?? []),
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $this->mainSystemSyncService->receiveChannels(
            $payload,
            $request->bearerToken(),
        );

        return $this->sendResponse(['message' => 'Channel payload accepted.'], Response::HTTP_ACCEPTED);
    }
}

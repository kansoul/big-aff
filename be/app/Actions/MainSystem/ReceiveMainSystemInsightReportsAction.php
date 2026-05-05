<?php

namespace App\Actions\MainSystem;

use App\Jobs\PersistMainSystemInsightReportsJob;
use App\Models\MainTeam;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ReceiveMainSystemInsightReportsAction
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function execute(array $payload, ?string $token): void
    {
        $mainTeam = $this->authorizePayload($payload, $token);

        PersistMainSystemInsightReportsJob::dispatch($mainTeam->id, $payload)
            ->onQueue(config('queue.queues.main-system-sync'));

        Log::channel('sync_reports')->info('[MainSystemSync] Insight payload accepted and persist job dispatched', [
            'queue' => config('queue.queues.main-system-sync'),
            'main_team_id' => $mainTeam->id,
            'accounts_count' => count($payload['accounts'] ?? []),
            'campaigns_count' => count($payload['campaigns'] ?? []),
            'insights_count' => count($payload['insights'] ?? []),
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function authorizePayload(array $payload, ?string $token): MainTeam
    {
        if (! config('main_system.is_main')) {
            Log::channel('sync_reports')->warning('[MainSystemSync] Insight receive rejected: system is not main');
            abort(Response::HTTP_NOT_FOUND);
        }

        if (blank($token)) {
            Log::channel('sync_reports')->warning('[MainSystemSync] Insight receive rejected: missing bearer token', [
                'main_team_id' => $payload['main_team_id'] ?? null,
            ]);
            abort(Response::HTTP_UNAUTHORIZED);
        }

        $mainTeam = MainTeam::query()->findOrFail($payload['main_team_id']);

        if (! hash_equals($mainTeam->token, (string) $token)) {
            Log::channel('sync_reports')->warning('[MainSystemSync] Insight receive rejected: invalid token', [
                'main_team_id' => $mainTeam->id,
            ]);
            abort(Response::HTTP_UNAUTHORIZED);
        }

        return $mainTeam;
    }
}

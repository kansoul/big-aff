<?php

namespace App\Actions\MainSystem;

use App\Jobs\PersistMainSystemChannelsJob;
use App\Models\MainTeam;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class ReceiveMainSystemChannelsAction
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function execute(array $payload, ?string $token): void
    {
        $mainTeam = $this->authorizePayload($payload, $token);

        PersistMainSystemChannelsJob::dispatch($mainTeam->id, $payload['channels'])
            ->onQueue(config('queue.queues.main-system-sync'));

        Log::channel('sync_reports')->info('[MainSystemSync] Channel payload accepted and persist job dispatched', [
            'queue' => config('queue.queues.main-system-sync'),
            'main_team_id' => $mainTeam->id,
            'channels_count' => count($payload['channels'] ?? []),
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function authorizePayload(array $payload, ?string $token): MainTeam
    {
        if (! config('main_system.is_main')) {
            Log::channel('sync_reports')->warning('[MainSystemSync] Channel receive rejected: system is not main');
            abort(Response::HTTP_NOT_FOUND);
        }

        if (blank($token)) {
            Log::channel('sync_reports')->warning('[MainSystemSync] Channel receive rejected: missing bearer token', [
                'main_team_id' => $payload['main_team_id'] ?? null,
            ]);
            abort(Response::HTTP_UNAUTHORIZED);
        }

        $mainTeam = MainTeam::query()->findOrFail($payload['main_team_id']);

        if (! hash_equals($mainTeam->token, (string) $token)) {
            Log::channel('sync_reports')->warning('[MainSystemSync] Channel receive rejected: invalid token', [
                'main_team_id' => $mainTeam->id,
            ]);
            abort(Response::HTTP_UNAUTHORIZED);
        }

        return $mainTeam;
    }
}

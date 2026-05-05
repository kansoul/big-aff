<?php

namespace App\Actions\MainSystem;

use App\Jobs\PersistMainSystemChannelsJob;
use App\Models\MainTeam;
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
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function authorizePayload(array $payload, ?string $token): MainTeam
    {
        if (! config('main_system.is_main')) {
            abort(Response::HTTP_NOT_FOUND);
        }

        if (blank($token)) {
            abort(Response::HTTP_UNAUTHORIZED);
        }

        $mainTeam = MainTeam::query()->findOrFail($payload['main_team_id']);

        if (! hash_equals($mainTeam->token, (string) $token)) {
            abort(Response::HTTP_UNAUTHORIZED);
        }

        return $mainTeam;
    }
}

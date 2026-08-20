<?php

namespace App\Actions\Tracking;

use App\Actions\Lead\StoreLeadAction;
use App\Jobs\SaveTrackingLogJob;
use App\Models\Lead;
use App\Models\RevenueReport;
use App\Models\TrackingSession;
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;

class StoreTrackingLogAction
{
    public function __construct(private readonly StoreLeadAction $storeLeadAction) {}

    /** @param array<string, mixed> $data */
    public function execute(array $data): string
    {
        [$sessionId, $isNewSession] = $this->findOrCreateSession($data);
        $data['created_at'] = now();

        if (filled($data['campaign_id'] ?? null)) {
            RevenueReport::query()->firstOrCreate(
                ['session_id' => $sessionId],
                [
                    'campaign_id' => $data['campaign_id'],
                    'adset_id' => $data['adset_id'] ?? null,
                    'ad_id' => $data['ad_id'] ?? null,
                    'revenue' => 0,
                    'created_at' => $data['created_at'],
                ],
            );
        }

        if (($data['type'] ?? null) === 'submit_form') {
            $lead = array_intersect_key($data, array_flip((new Lead)->getFillable()));
            unset($lead['session_id']);
            $this->storeLeadAction->execute($sessionId, $lead);
        }

        SaveTrackingLogJob::dispatch($sessionId, $data, $isNewSession);

        return $sessionId;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{0: string, 1: bool}
     */
    private function findOrCreateSession(array $data): array
    {
        $sessionId = $data['session_id'] ?? null;

        if (filled($sessionId)) {
            $session = TrackingSession::query()->find($sessionId);
            if ($session) {
                return [$session->session_id, false];
            }
        } else {
            $sessionId = (string) Str::uuid();
        }

        try {
            TrackingSession::query()->create([
                'session_id' => $sessionId,
                'ip_address' => $data['ip_address'] ?? null,
                'device' => $data['device'] ?? null,
                'browser' => $data['browser'] ?? null,
                'country' => $data['country'] ?? null,
                'referrer' => $data['referrer'] ?? null,
                'user_agent' => $data['user_agent'] ?? null,
                'is_bot' => $data['is_bot'] ?? false,
            ]);

            return [$sessionId, true];
        } catch (QueryException $exception) {
            if ($exception->getCode() === '23000' && TrackingSession::query()->find($sessionId)) {
                return [$sessionId, false];
            }

            throw $exception;
        }
    }
}

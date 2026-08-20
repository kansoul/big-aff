<?php

namespace App\Actions\Tracking;

use App\Actions\Lead\StoreLeadAction;
use App\Jobs\SaveTrackingLogJob;
use App\Models\Lead;
use App\Models\RevenueReport;
use App\Models\TrackingSession;
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;
use Ramsey\Uuid\Uuid;

class StoreTrackingLogAction
{
    /**
     * Attribution params the ad platforms substitute at click time — the same
     * set the link builder puts on the URL (see `fe/src/lib/link.ts`).
     */
    private const ATTRIBUTION_FIELDS = [
        'campaign_id', 'adset_id', 'ad_id',
    ];

    /** The visitor those params arrived with. */
    private const VISITOR_FIELDS = ['ip_address'];

    /**
     * How many sessions the same params + IP may open before we give up
     * walking and hand out a random id. A visitor converting dozens of times
     * from one IP is a bot or a shared NAT, not a funnel to keep numbering.
     */
    private const MAX_SESSION_ATTEMPTS = 50;

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
     * The snippet never mints an id: it replays the one this endpoint issued
     * earlier, and the id itself is derived here. A payload without one — the
     * landing hit, or a step whose storage was cleared — walks the ids its own
     * params and IP hash to and settles on the first session still open.
     *
     * @param  array<string, mixed>  $data
     * @return array{0: string, 1: bool}
     */
    private function findOrCreateSession(array $data): array
    {
        $sessionId = $data['session_id'] ?? null;

        if (filled($sessionId) && TrackingSession::query()->whereKey($sessionId)->exists()) {
            return [$sessionId, false];
        }

        $attributionKey = $this->attributionKey($data);

        if ($attributionKey === null) {
            return $this->createSession((string) Str::uuid(), $data);
        }

        for ($attempt = 0; $attempt < self::MAX_SESSION_ATTEMPTS; $attempt++) {
            $sessionId = $this->sessionIdFor($attributionKey, $attempt);

            if (! TrackingSession::query()->whereKey($sessionId)->exists()) {
                return $this->createSession($sessionId, $data);
            }

            // The lead closed that visit, so the visitor coming back on the
            // same link starts the funnel over on the next id in the walk.
            if (! $this->isClosed($sessionId)) {
                return [$sessionId, false];
            }
        }

        return $this->createSession((string) Str::uuid(), $data);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{0: string, 1: bool}
     */
    private function createSession(string $sessionId, array $data): array
    {
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
            // Two events of the same visit raced into the same derived id.
            if ($exception->getCode() === '23000' && TrackingSession::query()->whereKey($sessionId)->exists()) {
                return [$sessionId, false];
            }

            throw $exception;
        }
    }

    /**
     * A session is done once it produced its lead: `leads.session_id` is
     * unique, so its presence is the closing flag.
     */
    private function isClosed(string $sessionId): bool
    {
        return Lead::query()->where('session_id', $sessionId)->exists();
    }

    /**
     * What identifies the visit: the ad params of the click plus the IP they
     * arrived from. Null when the payload carries neither, because hashing
     * nothing would put every such visitor on one shared session.
     *
     * @param  array<string, mixed>  $data
     */
    private function attributionKey(array $data): ?string
    {
        $parts = [];

        foreach ([...self::ATTRIBUTION_FIELDS, ...self::VISITOR_FIELDS] as $field) {
            $parts[$field] = trim((string) ($data[$field] ?? ''));
        }

        return implode('', $parts) === '' ? null : implode('|', $parts);
    }

    /**
     * The session id is not random: it is the attribution key hashed into a
     * UUIDv5. The attempt number is part of the hash so the same visitor on
     * the same link gets a predictable series of ids — the first visit takes
     * attempt 0, and each converted visit pushes the next one along.
     */
    private function sessionIdFor(string $attributionKey, int $attempt): string
    {
        return (string) Uuid::uuid5(Uuid::NAMESPACE_URL, $attributionKey.'|'.$attempt);
    }
}

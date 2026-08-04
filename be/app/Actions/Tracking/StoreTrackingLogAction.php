<?php

namespace App\Actions\Tracking;

use App\Jobs\SaveTrackingLogJob;
use App\Models\TrackingSession;
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;

class StoreTrackingLogAction
{
    /**
     * save tracking log
     */
    public function execute(array $data): string
    {
        $sessionId = $this->findOrCreateSession($data);

        $data['created_at'] = now();
        SaveTrackingLogJob::dispatch($sessionId, $data);

        return $sessionId;
    }

    /**
     * Find or create tracking session
     */
    protected function findOrCreateSession(array $data): string
    {
        $sessionId = $data['session_id'] ?? null;

        if (! empty($sessionId)) {
            $session = TrackingSession::where('session_id', $sessionId)->first();

            if ($session) {
                return $session->session_id;
            }
        } else {
            $sessionId = (string) Str::uuid();
        }

        $sessionData = [
            'session_id' => $sessionId,
            'ip_address' => $data['ip_address'] ?? null,
            'device' => $data['device'] ?? $this->detectDevice($data['user_agent'] ?? ''),
            'browser' => $data['browser'] ?? $this->detectBrowser($data['user_agent'] ?? ''),
            'country' => $data['country'] ?? null,
            'referrer' => $data['referrer'] ?? null,
            'user_agent' => $data['user_agent'] ?? null,
            'is_bot' => $data['is_bot'] ?? false,
        ];

        try {
            TrackingSession::create($sessionData);

            return $sessionId;
        } catch (QueryException $e) {
            if ($e->getCode() === '23000' && ! empty($data['session_id'])) {
                $session = TrackingSession::where('session_id', $data['session_id'])->first();

                if ($session) {
                    return $session->session_id;
                }
            }
            throw $e;
        }
    }

    /**
     * detect device
     */
    private function detectDevice(string $userAgent): string
    {
        $ua = strtolower($userAgent);

        if (str_contains($ua, 'mobile') || str_contains($ua, 'android') || str_contains($ua, 'iphone')) {
            return 'mobile';
        }

        if (str_contains($ua, 'tablet') || str_contains($ua, 'ipad')) {
            return 'tablet';
        }

        return 'desktop';
    }

    /**
     * detect browser
     */
    private function detectBrowser(string $userAgent): string
    {
        $ua = strtolower($userAgent);

        if (str_contains($ua, 'chrome') && ! str_contains($ua, 'edge')) {
            return 'Chrome';
        }

        if (str_contains($ua, 'firefox')) {
            return 'Firefox';
        }

        if (str_contains($ua, 'safari') && ! str_contains($ua, 'chrome')) {
            return 'Safari';
        }

        if (str_contains($ua, 'edge')) {
            return 'Edge';
        }

        return 'Unknown';
    }
}

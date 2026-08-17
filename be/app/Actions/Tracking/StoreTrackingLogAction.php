<?php

namespace App\Actions\Tracking;

use App\Actions\LoanApplication\CreateLoanApplicationAction;
use App\Actions\LoanApplication\UpdateLoanApplicationAction;
use App\Jobs\SaveTrackingLogJob;
use App\Models\LoanApplication;
use App\Models\TrackingSession;
use Illuminate\Database\QueryException;
use Illuminate\Support\Str;

class StoreTrackingLogAction
{
    public function __construct(
        protected CreateLoanApplicationAction $createLoanApplicationAction,
        protected UpdateLoanApplicationAction $updateLoanApplicationAction,
    ) {}

    /**
     * Save a tracking log entry.
     *
     * @param  array<string, mixed>  $data
     * @return array{session_id: string, public_id: ?string}
     */
    public function execute(array $data): array
    {
        $sessionId = $this->findOrCreateSession($data);
        $data['created_at'] = now();

        // next_step only writes the loan application, inline so the caller gets
        // its public id back; there is no event row for it.
        if (($data['type'] ?? null) === 'next_step') {
            return [
                'session_id' => $sessionId,
                'public_id' => $this->saveLoanApplication($data)->public_id,
            ];
        }

        SaveTrackingLogJob::dispatch($sessionId, $data);

        return [
            'session_id' => $sessionId,
            'public_id' => null,
        ];
    }

    /**
     * Persist the submitted wizard step, creating the application on first step.
     *
     * @param  array<string, mixed>  $data
     */
    protected function saveLoanApplication(array $data): LoanApplication
    {
        $fields = array_intersect_key(
            $data,
            array_flip([...LoanApplication::applicationFields(), 'campaign_id', 'utm_source', 'aff_click_id']),
        );

        if (! empty($data['completed'])) {
            $fields['completed_at'] = now();
        }

        $publicId = $data['public_id'] ?? null;

        if (! empty($publicId)) {
            $application = LoanApplication::where('public_id', $publicId)->first();

            if ($application) {
                return $this->updateLoanApplicationAction->execute($application, $fields);
            }
        }

        return $this->createLoanApplicationAction->execute($fields);
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

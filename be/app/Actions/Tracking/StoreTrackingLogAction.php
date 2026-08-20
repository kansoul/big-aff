<?php

namespace App\Actions\Tracking;

use App\Actions\LoanApplication\CreateLoanApplicationAction;
use App\Actions\LoanApplication\UpdateLoanApplicationAction;
use App\Jobs\SaveTrackingLogJob;
use App\Models\EventView;
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

    /** Events that carry the applicant's answers. */
    private const APPLICATION_TYPES = ['redirect', 'next_step', 'lead'];

    /** Ad params stored next to the answers, for reports that read the row. */
    private const ATTRIBUTION_FIELDS = ['campaign_id', 'adset_id', 'ad_id', 'utm_source', 'aff_click_id'];

    /**
     * Save a tracking log entry. Everything hangs off the session id the
     * snippet sends: the session row, the event row and the loan application.
     *
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): string
    {
        [$sessionId, $isNewSession] = $this->findOrCreateSession($data);

        $data['created_at'] = now();
        $type = $data['type'] ?? null;

        // redirect (email + loan amount), next_step (one wizard step) and lead
        // (final confirmation) all write into the same application row.
        if (in_array($type, self::APPLICATION_TYPES, true)) {
            $this->saveLoanApplication($data, $sessionId);
        }

        // next_step is form progress only; it produces no event row.
        if ($type !== 'next_step') {
            SaveTrackingLogJob::dispatch($sessionId, $data, $isNewSession);
        }

        return $sessionId;
    }

    /**
     * Write the answers this event carried onto the session's application,
     * creating it on the first event that brings any. Only the submitted
     * fields are touched, so every step adds onto the same row.
     *
     * @param  array<string, mixed>  $data
     */
    protected function saveLoanApplication(array $data, string $sessionId): void
    {
        $answers = array_intersect_key($data, array_flip(LoanApplication::applicationFields()));
        $application = LoanApplication::where('session_id', $sessionId)->latest('id')->first();

        // Nothing submitted and no row to close: this event stores no answers.
        if ($answers === [] && $application === null) {
            return;
        }

        $attribution = array_filter(
            array_intersect_key($data, array_flip(self::ATTRIBUTION_FIELDS)),
            fn ($value): bool => filled($value),
        );

        // The session that produced this step, so reports can join tracking data.
        $fields = [...$answers, ...$attribution, 'session_id' => $sessionId];

        // The lead is the final confirmation, so it closes the application.
        if (($data['type'] ?? null) === 'lead' || ! empty($data['completed'])) {
            $fields['completed_at'] = now();
        }

        if ($application) {
            $this->updateLoanApplicationAction->execute($application, $fields);

            return;
        }

        // Wizard steps travel without the ad params, so a row opened by one
        // takes them from the landing hit of the same session.
        $this->createLoanApplicationAction->execute([
            ...$this->sessionAttribution($sessionId),
            ...$fields,
        ]);
    }

    /**
     * The ad params of the session, as its landing hit recorded them.
     *
     * @return array<string, string>
     */
    protected function sessionAttribution(string $sessionId): array
    {
        $landing = EventView::where('session_id', $sessionId)
            ->orderBy('id')
            ->first(['campaign_id', 'adset_id', 'ad_id', 'utm_source']);

        return $landing
            ? array_filter($landing->only(['campaign_id', 'adset_id', 'ad_id', 'utm_source']), fn ($value): bool => filled($value))
            : [];
    }

    /**
     * Reuse the session the snippet replays; the snippet decides when a visit
     * ends (a `lead`, or the landing params changing), so any id arriving here
     * is taken as-is. The flag tells the caller whether this request is the
     * one that opened the session.
     *
     * @param  array<string, mixed>  $data
     * @return array{0: string, 1: bool}
     */
    protected function findOrCreateSession(array $data): array
    {
        $sessionId = $data['session_id'] ?? null;

        if (! empty($sessionId)) {
            $session = TrackingSession::where('session_id', $sessionId)->first();

            if ($session) {
                return [$session->session_id, false];
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

            return [$sessionId, true];
        } catch (QueryException $e) {
            // Two events of the same brand-new session racing each other.
            if ($e->getCode() === '23000') {
                $session = TrackingSession::where('session_id', $sessionId)->first();

                if ($session) {
                    return [$session->session_id, false];
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

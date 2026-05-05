<?php

namespace App\Services\MainSystem;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MainSystemHttpClient
{
    public function shouldPush(): bool
    {
        return $this->pushBlockers() === [];
    }

    /**
     * @return list<string>
     */
    public function pushBlockers(): array
    {
        $blockers = [];

        if (config('main_system.is_main')) {
            $blockers[] = 'MAIN_SYSTEM_IS_MAIN is true';
        }

        if (blank(config('main_system.api_url'))) {
            $blockers[] = 'MAIN_SYSTEM_API_URL is empty';
        }

        if (blank(config('main_system.main_team_id'))) {
            $blockers[] = 'MAIN_SYSTEM_MAIN_TEAM_ID is empty';
        }

        if (blank(config('main_system.token'))) {
            $blockers[] = 'MAIN_SYSTEM_TOKEN is empty';
        }

        return $blockers;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function post(string $path, array $payload): void
    {
        $url = $this->url($path);

        Log::channel('sync_reports')->info('[MainSystemSync] Sending HTTP payload', [
            'url' => $url,
            'main_team_id' => config('main_system.main_team_id'),
            'accounts_count' => count($payload['accounts'] ?? []),
            'campaigns_count' => count($payload['campaigns'] ?? []),
            'insights_count' => count($payload['insights'] ?? []),
            'channels_count' => count($payload['channels'] ?? []),
        ]);

        try {
            $response = Http::withToken((string) config('main_system.token'))
                ->acceptJson()
                ->asJson()
                ->connectTimeout((int) config('main_system.connect_timeout'))
                ->timeout((int) config('main_system.timeout'))
                ->retry(2, 500)
                ->post($url, $payload);
        } catch (\Exception $exception) {
            Log::channel('sync_reports')->error('[MainSystemSync] HTTP request failed', [
                'url' => $url,
                'error' => $exception->getMessage(),
            ]);

            throw $exception;
        }

        Log::channel('sync_reports')->info('[MainSystemSync] HTTP response received', [
            'url' => $url,
            'status' => $response->status(),
        ]);

        $response->throw();
    }

    public function urlFor(string $path): string
    {
        return $this->url($path);
    }

    private function url(string $path): string
    {
        $base = rtrim((string) config('main_system.api_url'), '/');
        $path = ltrim($path, '/');

        if (str_ends_with($base, '/api') && str_starts_with($path, 'api/')) {
            $path = substr($path, 4);
        }

        if (! str_ends_with($base, '/api') && ! str_starts_with($path, 'api/')) {
            $path = 'api/'.$path;
        }

        return $base.'/'.$path;
    }
}

<?php

namespace App\Services\MainSystem;

use Illuminate\Support\Facades\Http;

class MainSystemHttpClient
{
    public function shouldPush(): bool
    {
        return ! config('main_system.is_main')
            && filled(config('main_system.api_url'))
            && filled(config('main_system.main_team_id'))
            && filled(config('main_system.token'));
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function post(string $path, array $payload): void
    {
        Http::withToken((string) config('main_system.token'))
            ->acceptJson()
            ->asJson()
            ->connectTimeout((int) config('main_system.connect_timeout'))
            ->timeout((int) config('main_system.timeout'))
            ->retry(2, 500)
            ->post($this->url($path), $payload)
            ->throw();
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

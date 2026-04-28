<?php

namespace App\Models\Traits\Method;

use Carbon\Carbon;

trait GoogleOAuthTokenMethod
{
    public function isExpired(): bool
    {
        if (! $this->expires_at) {
            return true;
        }

        return $this->expires_at->isPast();
    }

    public static function getActiveToken(): ?static
    {
        return static::where('is_active', true)
            ->whereNotNull('access_token')
            ->whereNotNull('refresh_token')
            ->first();
    }

    public static function deactivateAll(): void
    {
        static::where('is_active', true)->update(['is_active' => false]);
    }

    public static function createOrUpdateFromGoogleResponse(array $tokenData): static
    {
        static::deactivateAll();

        $expiresAt = null;
        if (isset($tokenData['expires_in'])) {
            $expiresAt = Carbon::now()->addSeconds($tokenData['expires_in']);
        }

        return static::create([
            'access_token' => $tokenData['access_token'] ?? null,
            'refresh_token' => $tokenData['refresh_token'] ?? null,
            'token_type' => $tokenData['token_type'] ?? 'Bearer',
            'expires_in' => $tokenData['expires_in'] ?? null,
            'expires_at' => $expiresAt,
            'scope' => $tokenData['scope'] ?? null,
            'is_active' => true,
        ]);
    }

    public function getTokenData(): array
    {
        return [
            'access_token' => $this->access_token,
            'refresh_token' => $this->refresh_token,
            'token_type' => $this->token_type,
            'expires_in' => $this->expires_in,
            'expires_at' => $this->expires_at ? $this->expires_at->timestamp : null,
            'scope' => $this->scope,
        ];
    }
}

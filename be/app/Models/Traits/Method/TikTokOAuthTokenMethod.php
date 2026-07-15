<?php

namespace App\Models\Traits\Method;

use Carbon\Carbon;

trait TikTokOAuthTokenMethod
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

    public static function createOrUpdateFromTikTokResponse(array $tokenData, array $rawResponse): static
    {
        static::deactivateAll();

        $expiresAt = isset($tokenData['expires_in'])
            ? Carbon::now()->addSeconds((int) $tokenData['expires_in'])
            : null;

        $refreshTokenExpiresAt = isset($tokenData['refresh_token_expires_in'])
            ? Carbon::now()->addSeconds((int) $tokenData['refresh_token_expires_in'])
            : null;

        return static::create([
            'access_token' => $tokenData['access_token'] ?? null,
            'refresh_token' => $tokenData['refresh_token'] ?? null,
            'token_type' => $tokenData['token_type'] ?? 'Bearer',
            'expires_in' => $tokenData['expires_in'] ?? null,
            'expires_at' => $expiresAt,
            'refresh_token_expires_in' => $tokenData['refresh_token_expires_in'] ?? null,
            'refresh_token_expires_at' => $refreshTokenExpiresAt,
            'scope' => static::normalizeScope($tokenData['scope'] ?? null),
            'advertiser_ids' => $tokenData['advertiser_ids'] ?? [],
            'creator_id' => $tokenData['creator_id'] ?? null,
            'raw_response' => $rawResponse,
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
            'expires_at' => $this->expires_at?->timestamp,
            'refresh_token_expires_in' => $this->refresh_token_expires_in,
            'refresh_token_expires_at' => $this->refresh_token_expires_at?->timestamp,
            'scope' => $this->scope,
            'advertiser_ids' => $this->advertiser_ids,
            'creator_id' => $this->creator_id,
        ];
    }

    private static function normalizeScope(mixed $scope): ?string
    {
        if (is_array($scope)) {
            return implode(',', $scope);
        }

        return $scope ? (string) $scope : null;
    }
}

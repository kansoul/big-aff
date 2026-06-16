<?php

namespace App\Support\Gtag;

use App\Enums\AdsType;
use App\Models\Account;
use Illuminate\Support\Facades\Cache;

/**
 * Resolves gtag data for a google account when gtag is enabled.
 *
 * Results are cached by account_id with a short TTL. Misses are cached too
 * (negative caching) to avoid hammering the DB for accounts without gtag.
 * Mutations to gtags / accounts.gtag_enabled must call {@see forget()}.
 */
class GtagResolver
{
    private const CACHE_TTL_SECONDS = 300;

    /**
     * Sentinel stored when there is no gtag to return, so a cache hit can be
     * distinguished from a cache miss without re-querying the DB.
     */
    private const MISS_SENTINEL = 'none';

    /**
     * @return array{code: ?string, article_view: ?string, rsu_click: ?string, search_view: ?string, search_click: ?string}|null
     */
    public function resolve(?string $accountId): ?array
    {
        if (! $accountId) {
            return null;
        }

        $cached = Cache::remember(
            self::cacheKey($accountId),
            self::CACHE_TTL_SECONDS,
            fn () => $this->query($accountId) ?? self::MISS_SENTINEL,
        );

        return $cached === self::MISS_SENTINEL ? null : $cached;
    }

    /**
     * Drop the cached gtag entry for an account. Safe to call with null.
     */
    public function forget(?string $accountId): void
    {
        if (! $accountId) {
            return;
        }

        Cache::forget(self::cacheKey($accountId));
    }

    /**
     * @return array{code: ?string, article_view: ?string, rsu_click: ?string, search_view: ?string, search_click: ?string}|null
     */
    private function query(string $accountId): ?array
    {
        $account = Account::with('gtag')
            ->where('account_id', $accountId)
            ->where('ads_type', AdsType::GOOGLE->value)
            ->where('gtag_enabled', true)
            ->first();

        if (! $account || ! $account->gtag) {
            return null;
        }

        return [
            'code' => $account->gtag->code,
            'article_view' => $account->gtag->article_view,
            'rsu_click' => $account->gtag->rsu_click,
            'search_view' => $account->gtag->search_view,
            'search_click' => $account->gtag->search_click,
        ];
    }

    private static function cacheKey(string $accountId): string
    {
        return 'gtag:'.$accountId;
    }
}

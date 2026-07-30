<?php

namespace App\Services\Integrations\Contracts;

/**
 * Contract for provider-specific services that fetch ad/adset (ad group)
 * delivery insights for an advertiser account on a single day.
 *
 * ads platform ad sets map onto TikTok ad groups; both land in the shared
 * adset_insights_reports / ads_insights_reports tables, so implementations
 * must return rows already normalised to those schemas.
 */
interface AdsAdsetProvider
{
    /**
     * Fetch adset (ad group) and ad delivery insights for the given campaigns
     * on a single date. Returns null on API failure so the caller can skip the
     * account.
     *
     * @param  array<int, string>  $campaignIds
     * @return array{adsets: array<int, array<string, mixed>>, ads: array<int, array<string, mixed>>}|null
     */
    public function getAccountWithAdsAndAdsets(string $accountId, array $campaignIds, string $date): ?array;
}

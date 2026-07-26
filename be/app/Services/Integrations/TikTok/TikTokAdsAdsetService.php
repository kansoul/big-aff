<?php

namespace App\Services\Integrations\TikTok;

use App\Models\TikTokOAuthToken;
use App\Services\Integrations\Contracts\AdsAdsetProvider;
use Carbon\Carbon;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Fetches TikTok ad group (adset) and ad delivery insights for an advertiser
 * on a single day.
 *
 * Mirrors FacebookAdsAdsetService: a single getAccountWithAdsAndAdsets() call
 * returns both the ad group and ad rows, already normalised to the
 * adset_insights_reports / ads_insights_reports schemas. TikTok ad groups map
 * onto Facebook adsets. Metrics come from the integrated report; names,
 * budgets and statuses come from the /adgroup/get/ and /ad/get/ metadata
 * endpoints, keyed back onto the report rows.
 *
 * TikTok exposes a plain JSON REST API, so we use Laravel's HTTP client instead
 * of an SDK, matching TikTokAdsService.
 */
class TikTokAdsAdsetService implements AdsAdsetProvider
{
    private const REPORT_PATH = '/report/integrated/get/';

    private const ADGROUP_PATH = '/adgroup/get/';

    private const AD_PATH = '/ad/get/';

    private const PAGE_SIZE = 1000;

    /** @var array<int, string> */
    private const REPORT_METRICS = [
        'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm',
        'reach', 'frequency', 'conversion', 'cost_per_conversion',
    ];

    private string $baseUrl;

    private ?string $accessToken;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('tiktok.base_url'), '/');
        $this->accessToken = TikTokOAuthToken::getActiveToken()?->access_token;
    }

    /**
     * @param  array<int, string>  $campaignIds
     * @return array{adsets: array<int, array<string, mixed>>, ads: array<int, array<string, mixed>>}|null
     */
    public function getAccountWithAdsAndAdsets(string $accountId, array $campaignIds, string $date): ?array
    {
        $adsets = $this->fetchAdsets($accountId, $campaignIds, $date);
        if ($adsets === null) {
            return null;
        }

        $ads = $this->fetchAds($accountId, $campaignIds, $date);
        if ($ads === null) {
            return null;
        }

        return ['adsets' => $adsets, 'ads' => $ads];
    }

    /**
     * @param  array<int, string>  $campaignIds
     * @return array<int, array<string, mixed>>|null
     */
    private function fetchAdsets(string $accountId, array $campaignIds, string $date): ?array
    {
        $rows = $this->fetchInsights($accountId, $date, 'AUCTION_ADGROUP', ['adgroup_id', 'stat_time_day'], ['campaign_id', 'adgroup_name']);
        if ($rows === null) {
            return null;
        }

        $rows = $this->keepBillableRows($rows, 'adgroup_id', $campaignIds);
        if (empty($rows)) {
            return [];
        }

        $meta = $this->fetchMetadata(
            $accountId,
            self::ADGROUP_PATH,
            'adgroup_ids',
            array_values(array_unique(array_column($rows, 'adgroup_id'))),
            ['adgroup_id', 'adgroup_name', 'budget', 'budget_mode', 'operation_status', 'secondary_status', 'create_time', 'modify_time'],
            'adgroup_id',
        );
        if ($meta === null) {
            return null;
        }

        $adsets = [];
        foreach ($rows as $row) {
            $entry = $meta[$row['adgroup_id']] ?? [];
            $budgetMode = $entry['budget_mode'] ?? null;
            $budget = $this->toFloat($entry['budget'] ?? null);

            $adsets[] = [
                'adset_id' => $row['adgroup_id'],
                'adset_name' => (string) ($entry['adgroup_name'] ?? $row['adgroup_name'] ?? ''),
                'campaign_id' => $row['campaign_id'],
                'account_id' => $accountId,
                'status' => $this->mapStatus($entry['operation_status'] ?? null),
                'daily_budget' => $budgetMode === 'BUDGET_MODE_DAY' ? $budget : null,
                'spend' => $row['spend'],
                'date_start' => $row['date_start'],
                'date_stop' => $row['date_start'],
                'impressions' => $row['impressions'],
                'clicks' => $row['clicks'],
                'reach' => $row['reach'],
                'cpc' => $row['cpc'],
                'cpm' => $row['cpm'],
                'ctr' => $row['ctr'],
                'cpa' => $row['cpa'],
                'ad_clicks' => $row['clicks'],
                // Columns specific to Facebook insights — not available on TikTok.
                'article_views' => null,
                'search_views' => null,
                'search_click' => null,
                'inline_link_click_ctr' => null,
                'cost_per_inline_link_click' => null,
                'frequency' => $row['frequency'],
                'effective_status' => $entry['secondary_status'] ?? null,
                'updated_time' => $this->toDateTime($entry['modify_time'] ?? null),
                'created_time' => $this->toDateTime($entry['create_time'] ?? null),
            ];
        }

        return $adsets;
    }

    /**
     * @param  array<int, string>  $campaignIds
     * @return array<int, array<string, mixed>>|null
     */
    private function fetchAds(string $accountId, array $campaignIds, string $date): ?array
    {
        $rows = $this->fetchInsights($accountId, $date, 'AUCTION_AD', ['ad_id', 'stat_time_day'], ['campaign_id', 'adgroup_id', 'ad_name']);
        if ($rows === null) {
            return null;
        }

        $rows = $this->keepBillableRows($rows, 'ad_id', $campaignIds);
        if (empty($rows)) {
            return [];
        }

        $meta = $this->fetchMetadata(
            $accountId,
            self::AD_PATH,
            'ad_ids',
            array_values(array_unique(array_column($rows, 'ad_id'))),
            ['ad_id', 'ad_name', 'adgroup_id', 'campaign_id', 'operation_status', 'secondary_status', 'create_time', 'modify_time'],
            'ad_id',
        );
        if ($meta === null) {
            return null;
        }

        $ads = [];
        foreach ($rows as $row) {
            $entry = $meta[$row['ad_id']] ?? [];

            $ads[] = [
                'ad_id' => $row['ad_id'],
                'ad_name' => (string) ($entry['ad_name'] ?? $row['ad_name'] ?? ''),
                'adset_id' => (string) ($row['adgroup_id'] ?? ($entry['adgroup_id'] ?? '')),
                'campaign_id' => $row['campaign_id'],
                'account_id' => $accountId,
                'status' => $this->mapStatus($entry['operation_status'] ?? null),
                'spend' => $row['spend'],
                'date_start' => $row['date_start'],
                'date_stop' => $row['date_start'],
                'impressions' => $row['impressions'],
                'clicks' => $row['clicks'],
                'reach' => $row['reach'],
                'cpc' => $row['cpc'],
                'cpm' => $row['cpm'],
                'ctr' => $row['ctr'],
                'cpa' => $row['cpa'],
                'ad_clicks' => $row['clicks'],
                // Columns specific to Facebook insights — not available on TikTok.
                'article_views' => null,
                'search_views' => null,
                'search_click' => null,
                'inline_link_click_ctr' => null,
                'cost_per_inline_link_click' => null,
                'frequency' => $row['frequency'],
                'effective_status' => $entry['secondary_status'] ?? null,
                'updated_time' => $this->toDateTime($entry['modify_time'] ?? null),
                'created_time' => $this->toDateTime($entry['create_time'] ?? null),
            ];
        }

        return $ads;
    }

    /**
     * Fetch a single day of integrated report rows at the given data level. The
     * primary dimension id (adgroup_id / ad_id) is returned under `dimensions`;
     * additional ids requested via $extraMetrics come back under `metrics`.
     *
     * @param  array<int, string>  $dimensions
     * @param  array<int, string>  $extraMetrics
     * @return array<int, array<string, mixed>>|null
     */
    private function fetchInsights(string $advertiserId, string $date, string $dataLevel, array $dimensions, array $extraMetrics): ?array
    {
        try {
            $rows = [];
            $page = 1;

            do {
                $response = $this->client()->get($this->baseUrl.self::REPORT_PATH, [
                    'advertiser_id' => $advertiserId,
                    'report_type' => 'BASIC',
                    'data_level' => $dataLevel,
                    'dimensions' => json_encode($dimensions),
                    'metrics' => json_encode(array_merge($extraMetrics, self::REPORT_METRICS)),
                    'start_date' => $date,
                    'end_date' => $date,
                    'page' => $page,
                    'page_size' => self::PAGE_SIZE,
                ]);

                $payload = $this->decode($response->json(), $advertiserId, $dataLevel);
                if ($payload === null) {
                    return null;
                }

                $idKey = $dimensions[0];

                foreach (($payload['list'] ?? []) as $item) {
                    $dims = $item['dimensions'] ?? [];
                    $metrics = $item['metrics'] ?? [];

                    $row = [
                        'campaign_id' => (string) ($metrics['campaign_id'] ?? ''),
                        'adgroup_id' => isset($metrics['adgroup_id']) ? (string) $metrics['adgroup_id'] : null,
                        'adgroup_name' => $metrics['adgroup_name'] ?? null,
                        'ad_name' => $metrics['ad_name'] ?? null,
                        'date_start' => $this->toDate($dims['stat_time_day'] ?? null),
                        'impressions' => $this->toInt($metrics['impressions'] ?? null),
                        'clicks' => $this->toInt($metrics['clicks'] ?? null),
                        'reach' => $this->toInt($metrics['reach'] ?? null),
                        'cpa' => $this->toFloat($metrics['cost_per_conversion'] ?? null),
                        'spend' => $this->toFloat($metrics['spend'] ?? null),
                        'cpc' => $this->toFloat($metrics['cpc'] ?? null),
                        'cpm' => $this->toFloat($metrics['cpm'] ?? null),
                        'ctr' => $this->toFloat($metrics['ctr'] ?? null),
                        'frequency' => $this->toFloat($metrics['frequency'] ?? null),
                    ];

                    // Assign the primary dimension id last so it wins even when it
                    // shares a name with a metric column (e.g. adgroup_id).
                    $row[$idKey] = (string) ($dims[$idKey] ?? '');

                    $rows[] = $row;
                }

                $totalPage = (int) ($payload['page_info']['total_page'] ?? 1);
                $page++;
            } while ($page <= $totalPage);

            return $rows;
        } catch (Throwable $e) {
            Log::error('[TikTokAdsAdsetService] fetchInsights failed: '.$e->getMessage().' - '.$advertiserId);

            return null;
        }
    }

    /**
     * Fetch entity metadata for the referenced ids, keyed by $keyField.
     *
     * @param  array<int, string>  $ids
     * @param  array<int, string>  $fields
     * @return array<string, array<string, mixed>>|null
     */
    private function fetchMetadata(string $advertiserId, string $path, string $filterKey, array $ids, array $fields, string $keyField): ?array
    {
        if (empty($ids)) {
            return [];
        }

        try {
            $entries = [];
            $page = 1;

            do {
                $response = $this->client()->get($this->baseUrl.$path, [
                    'advertiser_id' => $advertiserId,
                    'filtering' => json_encode([$filterKey => $ids]),
                    'fields' => json_encode($fields),
                    'page' => $page,
                    'page_size' => self::PAGE_SIZE,
                ]);

                $payload = $this->decode($response->json(), $advertiserId, $path);
                if ($payload === null) {
                    return null;
                }

                foreach (($payload['list'] ?? []) as $entry) {
                    $key = (string) ($entry[$keyField] ?? '');
                    if ($key !== '') {
                        $entries[$key] = $entry;
                    }
                }

                $totalPage = (int) ($payload['page_info']['total_page'] ?? 1);
                $page++;
            } while ($page <= $totalPage);

            return $entries;
        } catch (Throwable $e) {
            Log::error('[TikTokAdsAdsetService] fetchMetadata failed: '.$e->getMessage().' - '.$advertiserId);

            return null;
        }
    }

    /**
     * Keep only rows that belong to the requested campaigns and actually spent,
     * mirroring FacebookAdsAdsetService's spend > 0 filter. Passing an empty
     * $campaignIds list disables the campaign filter.
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @param  array<int, string>  $campaignIds
     * @return array<int, array<string, mixed>>
     */
    private function keepBillableRows(array $rows, string $idKey, array $campaignIds): array
    {
        $allowed = array_map('strval', $campaignIds);

        return array_values(array_filter($rows, function (array $row) use ($idKey, $allowed): bool {
            if (($row[$idKey] ?? '') === '') {
                return false;
            }

            if (! empty($allowed) && ! in_array($row['campaign_id'], $allowed, true)) {
                return false;
            }

            return (float) ($row['spend'] ?? 0) > 0;
        }));
    }

    private function client(): PendingRequest
    {
        return Http::withHeaders([
            'Access-Token' => (string) $this->accessToken,
        ])->timeout(60)->retry(2, 1000);
    }

    /**
     * Unwrap the TikTok envelope. A non-zero `code` means the request failed;
     * we log and return null so the caller treats the account as failed.
     *
     * @param  mixed  $json
     * @return array<string, mixed>|null
     */
    private function decode($json, string $advertiserId, string $context): ?array
    {
        if (! is_array($json)) {
            Log::error("[TikTokAdsAdsetService] Empty/invalid response for {$context} - {$advertiserId}");

            return null;
        }

        if ((int) ($json['code'] ?? -1) !== 0) {
            Log::error("[TikTokAdsAdsetService] API error for {$context} - {$advertiserId}", [
                'code' => $json['code'] ?? null,
                'message' => $json['message'] ?? null,
            ]);

            return null;
        }

        return $json['data'] ?? [];
    }

    /**
     * Map TikTok operation_status onto the ACTIVE/PAUSED vocabulary the rest of
     * the system (campaign rules, delivery entities) already expects.
     */
    private function mapStatus(?string $operationStatus): string
    {
        return $operationStatus === 'ENABLE' ? 'ACTIVE' : 'PAUSED';
    }

    private function toDate(?string $value): ?string
    {
        if (empty($value)) {
            return null;
        }

        return Carbon::parse($value)->toDateString();
    }

    private function toDateTime(?string $value): ?Carbon
    {
        return empty($value) ? null : Carbon::parse($value);
    }

    private function toInt(mixed $value): ?int
    {
        return $value === null || $value === '' ? null : (int) $value;
    }

    private function toFloat(mixed $value): ?float
    {
        return $value === null || $value === '' ? null : (float) $value;
    }
}

<?php

namespace App\Services\Integrations\Adsense;

use App\Models\AdClient;
use App\Models\Channel;
use App\Models\GoogleOAuthToken;
use App\Models\RevenueChartReport;
use App\Models\RevenueReport;
use App\Models\Style;
use App\Services\MainSystem\MainSystemSyncService;
use Carbon\Carbon;
use Exception;
use Google\Client as GoogleClient;
use Google\Service\Adsense as GoogleServiceAdsense;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class RevenueReportSyncService
{
    private GoogleServiceAdsense $service;

    private GoogleClient $client;

    public function __construct()
    {
        $this->initializeClient();
    }

    private function initializeClient(): void
    {
        $oauth2 = config('google.oauth2_adsense');

        if (empty($oauth2['client_id']) || empty($oauth2['client_secret'])) {
            throw new Exception('Missing Google AdSense oauth2_adsense client_id/client_secret in config/google.php');
        }

        $this->client = new GoogleClient;
        $this->client->setApplicationName(config('google.application_name'));
        $this->client->setScopes(config('google.scopes.adsense'));
        $this->client->setClientId($oauth2['client_id']);
        $this->client->setClientSecret($oauth2['client_secret']);

        $this->loadToken();
        $this->service = new GoogleServiceAdsense($this->client);
    }

    private function loadToken(): void
    {
        $token = GoogleOAuthToken::getActiveToken();
        if ($token && ! $token->isExpired()) {
            $this->client->setAccessToken($token->getTokenData());

            return;
        }

        $refreshToken = config('google.oauth2_adsense.refresh_token');
        if (! $refreshToken) {
            throw new Exception('Missing Google AdSense oauth2_adsense refresh_token in config/google.php');
        }

        $this->refreshAndSaveToken($refreshToken);
    }

    private function refreshAndSaveToken(string $refreshToken): void
    {
        $this->client->fetchAccessTokenWithRefreshToken($refreshToken);
        $tokenData = $this->client->getAccessToken();
        if ($tokenData) {
            GoogleOAuthToken::createOrUpdateFromGoogleResponse($tokenData);
        }
    }

    /**
     * Entry point: sync AdSense data for the given ad_client_id and date range.
     * Saves raw snapshots to revenue_chart_reports, then aggregates into revenue_reports.
     *
     * @param  array{ad_client_id: string, start_date?: string, end_date?: string}  $data
     * @return array{success: bool, message: string, synced_count?: int, skipped?: int, errors?: list<string>}
     */
    public static function sync(array $data): array
    {
        try {
            $service = new self;

            return $service->performSync($data);
        } catch (Exception $e) {
            Log::channel('sync_reports')->error('[RevenueReportSync] Init error', ['error' => $e->getMessage()]);

            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    private function performSync(array $data): array
    {
        $logger = Log::channel('sync_reports');

        try {
            $accountId = trim($data['ad_client_id'] ?? '');
            if ($accountId === '') {
                return ['success' => false, 'message' => 'ad_client_id is required'];
            }

            $startDate = $data['start_date'] ?? Carbon::now()->startOfMonth()->toDateString();
            $endDate = $data['end_date'] ?? Carbon::now()->endOfMonth()->toDateString();

            $resp = $this->fetchAdsenseReports($accountId, $startDate, $endDate);
            if (! $resp['success']) {
                return ['success' => false, 'message' => $resp['message'] ?? 'Failed to fetch AdSense reports'];
            }

            $obj = $resp['data'] ?? null;
            if (! $obj) {
                return ['success' => true, 'message' => 'No data object returned', 'synced_count' => 0, 'errors' => []];
            }

            $headers = [];
            foreach (($obj->headers ?? []) as $h) {
                $name = is_object($h) ? ($h->name ?? null) : ($h['name'] ?? null);
                if ($name) {
                    $headers[] = $name;
                }
            }

            if (! $headers) {
                return ['success' => false, 'message' => 'Empty headers from AdSense report'];
            }

            $rows = is_array($obj->rows ?? null) ? $obj->rows : [];
            if (! $rows) {
                return [
                    'success' => true,
                    'message' => 'No data rows returned',
                    'synced_count' => 0,
                    'warnings' => (array) ($obj->warnings ?? []),
                    'matched_rows' => (int) ($obj->totalMatchedRows ?? 0),
                ];
            }

            $account = AdClient::where('ad_client_id', $accountId)->first();
            $synced = 0;
            $skipped = 0;
            $errors = [];
            $syncedDates = [];

            foreach ($rows as $r) {
                try {
                    $cells = [];
                    $cellItems = is_object($r) ? ($r->cells ?? []) : ($r['cells'] ?? []);
                    foreach ((array) $cellItems as $cell) {
                        $cells[] = is_object($cell) ? ($cell->value ?? null) : ($cell['value'] ?? null);
                    }

                    $rowData = $this->processReportRow($cells, $headers, $account);

                    if ($rowData) {
                        $this->saveReport($rowData);
                        $synced++;
                    } else {
                        $skipped++;
                    }
                } catch (Throwable $e) {
                    $errors[] = $e->getMessage();
                    $logger->error('[RevenueReportSync] Row error', ['error' => $e->getMessage(), 'row' => $r]);
                }
            }

            try {
                app(MainSystemSyncService::class)->dispatchChannels();
            } catch (Throwable $e) {
                $logger->error('[RevenueReportSync][MainSystemChannels] Dispatch failed', [
                    'error' => $e->getMessage(),
                ]);
            }

            return [
                'success' => true,
                'message' => "Synced {$synced} chart snapshots".($errors ? (' with '.count($errors).' errors') : ''),
                'synced_count' => $synced,
                'skipped' => $skipped,
                'aggregated_dates' => count($syncedDates),
                'warnings' => (array) ($obj->warnings ?? []),
                'matched_rows' => (int) ($obj->totalMatchedRows ?? ($synced + $skipped)),
                'errors' => $errors,
            ];
        } catch (Throwable $e) {
            $logger->error('[RevenueReportSync] Fatal error', ['error' => $e->getMessage()]);

            return ['success' => false, 'message' => 'Sync failed: '.$e->getMessage()];
        }
    }

    private function fetchAdsenseReports(
        string $accountId,
        string $startDate,
        string $endDate
    ): array {
        try {
            if ($this->client->isAccessTokenExpired()) {
                $this->refreshAndSaveToken(config('google.oauth2_adsense.refresh_token'));
            }

            $start = Carbon::parse($startDate);
            $end = Carbon::parse($endDate);
            $accountResource = 'accounts/'.ltrim($accountId, 'accounts/');

            $reports = $this->service->accounts_reports->generate(
                $accountResource,
                [
                    'startDate.year' => (int) $start->year,
                    'startDate.month' => (int) $start->month,
                    'startDate.day' => (int) $start->day,
                    'endDate.year' => (int) $end->year,
                    'endDate.month' => (int) $end->month,
                    'endDate.day' => (int) $end->day,
                    'metrics' => [
                        'PAGE_VIEWS',
                        'CLICKS',
                        'AD_REQUESTS',
                        'IMPRESSIONS',
                        'AD_REQUESTS_RPM',
                        'IMPRESSIONS_RPM',
                        'ESTIMATED_EARNINGS',
                        'COST_PER_CLICK',
                        'FUNNEL_REQUESTS',
                        'FUNNEL_IMPRESSIONS',
                        'FUNNEL_CLICKS',
                        'FUNNEL_RPM',
                    ],
                    'reportingTimeZone' => 'GOOGLE_TIME_ZONE',
                    'dimensions' => [
                        'CUSTOM_CHANNEL_NAME',
                        'CUSTOM_CHANNEL_ID',
                        'DATE',
                    ],
                ]
            );

            return ['success' => true, 'data' => $reports->toSimpleObject()];
        } catch (Exception $e) {
            Log::channel('sync_reports')->error('[RevenueReportSync] Fetch error', ['error' => $e->getMessage()]);

            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Map row cells to a keyed array using headers, resolve style/channel, return null if unresolvable.
     *
     * @param  list<string|null>  $row
     * @param  list<string>  $headers
     * @return array<string, mixed>|null
     */
    private function processReportRow(array $row, array $headers, ?AdClient $account): ?array
    {
        $map = [];
        foreach ($headers as $i => $name) {
            $map[$name] = $row[$i] ?? null;
        }

        $date = $map['DATE'] ?? null;
        $chanId = $map['CUSTOM_CHANNEL_ID'] ?? null;
        $channelId = str_replace($account->product_code.':', '', $chanId);

        if (! $date || ! $channelId) {
            return null;
        }

        $style = Style::first();
        if (! $style) {
            return null;
        }

        // Default channel fallback (same as tracking-afs)
        $channel = Channel::where('code', $channelId)->first();
        if (! $channel) {
            return null;
        }

        return [
            'ad_client_id' => $account?->ad_client_id,
            'style_code' => $style->code,
            'channel_code' => $channel->code,
            'style_name' => $style->name,
            'channel_name' => $channel->name,
            'date' => $date,

            'page_views' => (int) ($map['PAGE_VIEWS'] ?? 0),
            'clicks' => (int) ($map['CLICKS'] ?? 0),
            'ad_requests' => (int) ($map['AD_REQUESTS'] ?? 0),
            'impressions' => (int) ($map['IMPRESSIONS'] ?? 0),
            'ad_requests_rpm' => (float) ($map['AD_REQUESTS_RPM'] ?? 0),
            'impressions_rpm' => (float) ($map['IMPRESSIONS_RPM'] ?? 0),
            'estimated_earnings' => (float) ($map['ESTIMATED_EARNINGS'] ?? 0),
            'cost_per_click' => (float) ($map['COST_PER_CLICK'] ?? 0),
            'funnel_requests' => (int) ($map['FUNNEL_REQUESTS'] ?? 0),
            'funnel_impressions' => (int) ($map['FUNNEL_IMPRESSIONS'] ?? 0),
            'funnel_clicks' => (int) ($map['FUNNEL_CLICKS'] ?? 0),
            'funnel_rpm' => (float) ($map['FUNNEL_RPM'] ?? 0),
        ];
    }

    /**
     * Upsert into revenue_reports first, then persist a timestamped snapshot into revenue_chart_reports.
     *
     * @param  array<string, mixed>  $rowData  must contain 'date' key
     */
    private function saveReport(array $rowData): void
    {
        $now = Carbon::now();

        RevenueReport::upsert(
            [[
                'ad_client_id' => $rowData['ad_client_id'],
                'style_code' => $rowData['style_code'],
                'channel_code' => $rowData['channel_code'],
                'date' => $rowData['date'],
                'style_name' => $rowData['style_name'],
                'channel_name' => $rowData['channel_name'],
                'page_views' => $rowData['page_views'],
                'clicks' => $rowData['clicks'],
                'ad_requests' => $rowData['ad_requests'],
                'impressions' => $rowData['impressions'],
                'ad_requests_rpm' => $rowData['ad_requests_rpm'],
                'impressions_rpm' => $rowData['impressions_rpm'],
                'estimated_earnings' => $rowData['estimated_earnings'],
                'cost_per_click' => $rowData['cost_per_click'],
                'funnel_requests' => $rowData['funnel_requests'],
                'funnel_impressions' => $rowData['funnel_impressions'],
                'funnel_clicks' => $rowData['funnel_clicks'],
                'funnel_rpm' => $rowData['funnel_rpm'],
                'updated_at' => $now,
            ]],
            uniqueBy: ['ad_client_id', 'style_code', 'channel_code', 'date'],
            update: [
                'style_name',
                'channel_name',
                'page_views',
                'clicks',
                'ad_requests',
                'impressions',
                'ad_requests_rpm',
                'impressions_rpm',
                'estimated_earnings',
                'cost_per_click',
                'funnel_requests',
                'funnel_impressions',
                'funnel_clicks',
                'funnel_rpm',
                'updated_at',
            ],
        );

        RevenueChartReport::create([
            ...array_diff_key($rowData, ['date' => null]),
            'datetime' => $now,
        ]);
    }

    /**
     * Aggregate all revenue_chart_reports for a given account + date
     * into a single upserted row in revenue_reports.
     *
     * Strategy: take the LATEST snapshot per (ad_client_id, style_code, channel_code, date)
     * since AdSense numbers accumulate intraday — the newest record is the most accurate.
     */
    public static function aggregateToRevenueReport(string $adClientId, string $date): void
    {
        $dateStart = Carbon::parse($date)->startOfDay();
        $dateEnd = Carbon::parse($date)->endOfDay();

        // Resolve latest snapshot per style+channel in a single JOIN query (avoids N+1)
        $latestSub = RevenueChartReport::select(['style_code', 'channel_code', DB::raw('MAX(datetime) as max_datetime')])
            ->where('ad_client_id', $adClientId)
            ->whereBetween('datetime', [$dateStart, $dateEnd])
            ->whereNull('deleted_at')
            ->groupBy('style_code', 'channel_code');

        $rows = RevenueChartReport::query()
            ->where('revenue_chart_reports.ad_client_id', $adClientId)
            ->joinSub($latestSub, 'latest', function ($join) {
                $join->on('revenue_chart_reports.style_code', '=', 'latest.style_code')
                    ->on('revenue_chart_reports.channel_code', '=', 'latest.channel_code')
                    ->on('revenue_chart_reports.datetime', '=', 'latest.max_datetime');
            })
            ->get(['revenue_chart_reports.*']);

        if ($rows->isEmpty()) {
            return;
        }

        $now = Carbon::now();

        $upsertRows = $rows->map(fn (RevenueChartReport $r) => [
            'ad_client_id' => $r->ad_client_id,
            'style_code' => $r->style_code,
            'channel_code' => $r->channel_code,
            'date' => $date,
            'style_name' => $r->style_name,
            'channel_name' => $r->channel_name,
            'page_views' => $r->page_views,
            'clicks' => $r->clicks,
            'ad_requests' => $r->ad_requests,
            'impressions' => $r->impressions,
            'ad_requests_rpm' => $r->ad_requests_rpm,
            'impressions_rpm' => $r->impressions_rpm,
            'estimated_earnings' => $r->estimated_earnings,
            'cost_per_click' => $r->cost_per_click,
            'funnel_requests' => $r->funnel_requests,
            'funnel_impressions' => $r->funnel_impressions,
            'funnel_clicks' => $r->funnel_clicks,
            'funnel_rpm' => $r->funnel_rpm,
            'updated_at' => $now,
        ])->all();

        RevenueReport::upsert(
            $upsertRows,
            uniqueBy: ['ad_client_id', 'style_code', 'channel_code', 'date'],
            update: [
                'style_name',
                'channel_name',
                'page_views',
                'clicks',
                'ad_requests',
                'impressions',
                'ad_requests_rpm',
                'impressions_rpm',
                'estimated_earnings',
                'cost_per_click',
                'funnel_requests',
                'funnel_impressions',
                'funnel_clicks',
                'funnel_rpm',
                'updated_at',
            ],
        );
    }
}

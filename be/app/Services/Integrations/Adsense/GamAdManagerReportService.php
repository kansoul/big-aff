<?php

namespace App\Services\Integrations\Adsense;

use App\Services\Integrations\Adsense\Traits\HasAdxRowHelpers;
use App\Services\Integrations\Google\GamSoapClientFactory;
use Carbon\CarbonImmutable;
use Google\AdsApi\AdManager\v202605\AdSenseSettings;
use Google\AdsApi\AdManager\v202605\AdUnit;
use Google\AdsApi\AdManager\v202605\AdUnitSize;
use Google\AdsApi\AdManager\v202605\Date;
use Google\AdsApi\AdManager\v202605\InventoryService;
use Google\AdsApi\AdManager\v202605\ReportDownloadOptions;
use Google\AdsApi\AdManager\v202605\ReportJob;
use Google\AdsApi\AdManager\v202605\ReportQuery;
use Google\AdsApi\AdManager\v202605\ReportService;
use Google\AdsApi\AdManager\v202605\Size;
use Google\AdsApi\AdManager\v202605\Statement;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use RuntimeException;

/**
 * Fetches AdX/GAM revenue reports via the **legacy SOAP API**
 * (`googleads/googleads-php-lib` library).
 *
 * For the newer REST-based Beta API, see {@see GamAdManagerBetaReportService}.
 */
class GamAdManagerReportService
{
    use HasAdxRowHelpers;

    public function __construct(private readonly GamSoapClientFactory $gamFactory) {}

    private const REPORT_COLUMNS = [
        'AD_EXCHANGE_LINE_ITEM_LEVEL_IMPRESSIONS',
        'AD_EXCHANGE_LINE_ITEM_LEVEL_CLICKS',
        'AD_EXCHANGE_LINE_ITEM_LEVEL_REVENUE',
        'AD_EXCHANGE_LINE_ITEM_LEVEL_AVERAGE_ECPM',
        'AD_EXCHANGE_RESPONSES_SERVED',
    ];

    private const DIMENSIONS = [
        'date' => 'DATE_PT',
        'site' => 'SITE_NAME',
        'channel' => 'CHANNEL_NAME',
        'ad_unit' => 'AD_UNIT_NAME',
        'ad_unit_id' => 'AD_UNIT_ID',
        'country' => 'COUNTRY_NAME',
        'domain' => 'DOMAIN',
        'demand_channel' => 'DEMAND_CHANNEL_NAME',
        'ad_exchange_product' => 'AD_EXCHANGE_PRODUCT_NAME',
        'ad_type' => 'AD_TYPE_NAME',
        'custom_criteria' => 'CUSTOM_CRITERIA',
        'custom_targeting_value_id' => 'CUSTOM_TARGETING_VALUE_ID',
    ];

    /**
     * @param  array{date_from: string, date_to: string, dimensions?: list<string>|null, currency?: string|null}  $filters
     * @return array<string, mixed>
     */
    public function fetchAdxRevenue(array $filters): array
    {
        $requestedDimensions = $this->requestedDimensions($filters['dimensions'] ?? null);
        $reportDimensions = array_map(fn (string $d) => self::DIMENSIONS[$d], $requestedDimensions);
        $dateFrom = CarbonImmutable::parse($filters['date_from']);
        $dateTo = CarbonImmutable::parse($filters['date_to']);
        $currency = $filters['currency'] ?? null;

        $reportQuery = new ReportQuery;
        $reportQuery->setDimensions($reportDimensions);
        $reportQuery->setColumns(self::REPORT_COLUMNS);
        $reportQuery->setDateRangeType('CUSTOM_DATE');
        $reportQuery->setStartDate($this->gamDate($dateFrom));
        $reportQuery->setEndDate($this->gamDate($dateTo));
        $reportQuery->setTimeZoneType('PACIFIC');
        if ($currency !== null) {
            $reportQuery->setReportCurrency($currency);
        }

        $reportJob = new ReportJob;
        $reportJob->setReportQuery($reportQuery);

        /** @var ReportService $reportService */
        $reportService = $this->gamFactory->make(ReportService::class);

        $reportJob = $reportService->runReportJob($reportJob);
        $reportJobId = $reportJob->getId();

        $this->waitUntilReportCompletes($reportService, $reportJobId);
        $downloadUrl = $this->getDownloadUrl($reportService, $reportJobId);
        $csv = $this->downloadCsv($downloadUrl);
        $rows = $this->parseCsv($csv);

        return [
            'source' => 'google_ad_manager_adx',
            'network_code' => (string) config('google.ad_manager.network_code'),
            'date_from' => $dateFrom->toDateString(),
            'date_to' => $dateTo->toDateString(),
            'currency' => $currency,
            'dimensions' => $requestedDimensions,
            'report_job_id' => $reportJobId,
            'summary' => $this->summarizeRows($rows),
            'rows' => $rows,
        ];
    }

    /**
     * Fetch AdX/GAM revenue by custom targeting, then resolve campaign IDs from the
     * custom criteria dimension (for example: campid=1234567890).
     *
     * @param  array{date_from: string, date_to: string, gam_custom_key?: string|null, custom_targeting_values?: list<string>|null, currency?: string|null}  $filters
     * @return array<string, mixed>
     */
    public function fetchAdxRevenueByCustomTargeting(array $filters): array
    {
        $customKey = $filters['gam_custom_key'] ?? 'campid';
        $allowedValues = collect($filters['custom_targeting_values'] ?? [])
            ->map(fn ($value) => trim((string) $value))
            ->filter()
            ->flip();

        $report = $this->fetchAdxRevenue([
            'date_from' => $filters['date_from'],
            'date_to' => $filters['date_to'],
            'currency' => $filters['currency'] ?? null,
            'dimensions' => ['date', 'custom_criteria', 'ad_unit_id', 'ad_unit'],
        ]);

        $rows = collect($report['rows'] ?? [])
            ->map(function (array $row) use ($customKey): ?array {
                $criteria = (string) data_get($row, 'dimensions.custom_criteria', '');
                $campaignId = $this->extractCustomTargetingValue($criteria, $customKey);

                if ($campaignId === null) {
                    return null;
                }

                return [
                    ...$row,
                    'gam_custom_key' => $customKey,
                    'gam_custom_value' => $campaignId,
                    'campaign_id' => $campaignId,
                ];
            })
            ->filter()
            ->when(
                $allowedValues->isNotEmpty(),
                fn ($collection) => $collection->filter(fn (array $row) => $allowedValues->has($row['campaign_id']))
            )
            ->values()
            ->all();

        return [
            ...$report,
            'dimensions' => ['date', 'custom_criteria', 'ad_unit_id', 'ad_unit'],
            'rows' => $rows,
            'summary' => $this->summarizeRows($rows),
        ];
    }

    /**
     * Fetch AdX/GAM revenue broken down by ad unit.
     *
     * @param  array{date_from: string, date_to: string, ad_unit_ids?: list<string>|null, currency?: string|null}  $filters
     * @return array<string, mixed>
     */
    public function fetchAdxRevenueByAdUnit(array $filters): array
    {
        $allowedIds = collect($filters['ad_unit_ids'] ?? [])
            ->map(fn ($id) => trim((string) $id))
            ->filter()
            ->flip();

        $report = $this->fetchAdxRevenue([
            'date_from' => $filters['date_from'],
            'date_to' => $filters['date_to'],
            'currency' => $filters['currency'] ?? null,
            'dimensions' => ['date', 'ad_unit_id', 'ad_unit', 'custom_criteria'],
        ]);

        $rows = collect($report['rows'] ?? [])
            ->when(
                $allowedIds->isNotEmpty(),
                fn ($col) => $col->filter(fn (array $row) => $allowedIds->has((string) data_get($row, 'dimensions.ad_unit_id', '')))
            )
            ->map(fn (array $row) => [
                ...$row,
                'ad_unit_id' => (string) data_get($row, 'dimensions.ad_unit_id', ''),
                'ad_unit_name' => (string) (data_get($row, 'dimensions.ad_unit_name') ?? data_get($row, 'dimensions.ad_unit', '')),
                'custom_criteria' => (string) data_get($row, 'dimensions.custom_criteria', ''),
            ])
            ->values()
            ->all();

        return [
            ...$report,
            'dimensions' => ['date', 'ad_unit_id', 'ad_unit', 'custom_criteria'],
            'rows' => $rows,
            'summary' => $this->summarizeRows($rows),
        ];
    }

    private function extractCustomTargetingValue(string $criteria, string $key): ?string
    {
        if ($criteria === '') {
            return null;
        }

        $pattern = '/(?:^|[,;\s])'.preg_quote($key, '/').'\s*(?:=\*|~\*|=|~)\s*([^,;\s]+)/';
        if (! preg_match($pattern, $criteria, $matches)) {
            return null;
        }

        $value = trim((string) ($matches[1] ?? ''));

        return $value === '' ? null : $value;
    }

    /**
     * @param  list<string>|null  $dimensions
     * @return list<string>
     */
    private function requestedDimensions(?array $dimensions): array
    {
        $dimensions = $dimensions ?: ['date', 'custom_criteria'];

        foreach ($dimensions as $dimension) {
            if (! array_key_exists($dimension, self::DIMENSIONS)) {
                throw new InvalidArgumentException("Unsupported GAM AdX dimension [{$dimension}].");
            }
        }

        return array_values(array_unique($dimensions));
    }

    private function waitUntilReportCompletes(ReportService $reportService, int $reportJobId): void
    {
        $attempts = max(1, (int) config('google.ad_manager.poll_attempts', 30));
        $interval = max(1, (int) config('google.ad_manager.poll_interval_seconds', 2));

        for ($attempt = 0; $attempt < $attempts; $attempt++) {
            $status = $reportService->getReportJobStatus($reportJobId);

            if ($status === 'COMPLETED') {
                return;
            }

            if ($status === 'FAILED') {
                throw new RuntimeException("GAM report job [{$reportJobId}] failed.");
            }

            sleep($interval);
        }

        throw new RuntimeException("GAM report job [{$reportJobId}] did not complete in time.");
    }

    private function getDownloadUrl(ReportService $reportService, int $reportJobId): string
    {
        $options = new ReportDownloadOptions;
        $options->setExportFormat('CSV_DUMP');
        $options->setIncludeReportProperties(false);
        $options->setIncludeTotalsRow(false);
        $options->setUseGzipCompression(false);

        $url = $reportService->getReportDownloadUrlWithOptions($reportJobId, $options);

        if (! is_string($url) || trim($url) === '') {
            throw new RuntimeException('GAM response did not contain a report download URL.');
        }

        return $url;
    }

    private function downloadCsv(string $downloadUrl): string
    {
        $response = Http::timeout(60)
            ->connectTimeout(10)
            ->retry([500, 1000, 2000])
            ->get($downloadUrl);

        $response->throw();

        return $response->body();
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function parseCsv(string $csv): array
    {
        $stream = fopen('php://temp', 'r+');
        if ($stream === false) {
            throw new RuntimeException('Unable to open temporary stream for GAM CSV parsing.');
        }

        fwrite($stream, $csv);
        rewind($stream);

        $headers = fgetcsv($stream, null, ',', '"', '');
        if ($headers === false) {
            fclose($stream);

            return [];
        }

        $headers = array_map(fn (string $header) => $this->normalizeHeader($header), $headers);
        $rows = [];

        while (($values = fgetcsv($stream, null, ',', '"', '')) !== false) {
            if ($values === [null] || $values === []) {
                continue;
            }

            $map = [];
            foreach ($headers as $index => $header) {
                $map[$header] = $values[$index] ?? null;
            }

            $revenueMicros = $this->parseMicros($map['ad_exchange_line_item_level_revenue'] ?? null);
            $ecpmMicros = $this->parseMicros($map['ad_exchange_line_item_level_average_ecpm'] ?? null);
            $impressions = $this->parseInteger($map['ad_exchange_line_item_level_impressions'] ?? null);
            $clicks = $this->parseInteger($map['ad_exchange_line_item_level_clicks'] ?? null);

            $rows[] = [
                'dimensions' => $this->extractDimensions($map),
                'ad_exchange_impressions' => $impressions,
                'ad_exchange_clicks' => $clicks,
                'ad_exchange_responses_served' => $this->parseInteger($map['ad_exchange_responses_served'] ?? null),
                'ad_exchange_revenue_micros' => $revenueMicros,
                'ad_exchange_revenue' => $this->microsToCurrency($revenueMicros),
                'ad_exchange_average_ecpm_micros' => $ecpmMicros,
                'ad_exchange_average_ecpm' => $this->microsToCurrency($ecpmMicros),
                'ad_exchange_ctr' => $impressions > 0 ? round(($clicks / $impressions) * 100, 4) : 0.0,
            ];
        }

        fclose($stream);

        return $rows;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private function extractDimensions(array $row): array
    {
        $metricHeaders = [
            'ad_exchange_line_item_level_impressions',
            'ad_exchange_line_item_level_clicks',
            'ad_exchange_line_item_level_revenue',
            'ad_exchange_line_item_level_average_ecpm',
            'ad_exchange_responses_served',
        ];

        return array_filter(
            array_diff_key($row, array_flip($metricHeaders)),
            fn (mixed $value) => $value !== null && $value !== ''
        );
    }

    private function normalizeHeader(string $header): string
    {
        $header = preg_replace('/^[A-Za-z]+\./', '', trim($header)) ?? $header;
        $header = strtolower($header);

        return str_replace([' ', '-'], '_', $header);
    }

    /**
     * Fetch all ad units from GAM InventoryService (paginated).
     *
     * @return list<array{id: string, name: string, description: string, parent_id: string|null, has_children: bool, status: string, ad_unit_code: string, target_window: string, is_interstitial: bool, is_native: bool, is_fluid: bool, adsense_enabled: bool, last_modified: string|null}>
     */
    public function fetchAdUnits(): array
    {
        /** @var InventoryService $inventoryService */
        $inventoryService = $this->gamFactory->make(InventoryService::class);

        $adUnits = [];
        $pageSize = 500;
        $offset = 0;

        do {
            $page = $inventoryService->getAdUnitsByStatement(
                new Statement("LIMIT {$pageSize} OFFSET {$offset}")
            );
            $results = $page->getResults() ?? [];

            foreach ($results as $unit) {
                $lastModified = null;
                $lmdt = $unit->getLastModifiedDateTime();
                if ($lmdt !== null) {
                    $d = $lmdt->getDate();
                    if ($d !== null) {
                        $lastModified = sprintf(
                            '%04d-%02d-%02d %02d:%02d:%02d',
                            $d->getYear(),
                            $d->getMonth(),
                            $d->getDay(),
                            $lmdt->getHour() ?? 0,
                            $lmdt->getMinute() ?? 0,
                            $lmdt->getSecond() ?? 0
                        );
                    }
                }

                $adSenseEnabled = false;
                $adSenseSettings = $unit->getAdSenseSettings();
                if ($adSenseSettings !== null) {
                    $adSenseEnabled = (bool) $adSenseSettings->getAdSenseEnabled();
                }

                $adUnits[] = [
                    'id' => (string) ($unit->getId() ?? ''),
                    'name' => (string) ($unit->getName() ?? ''),
                    'description' => (string) ($unit->getDescription() ?? ''),
                    'parent_id' => $unit->getParentId() !== null ? (string) $unit->getParentId() : null,
                    'has_children' => (bool) ($unit->getHasChildren() ?? false),
                    'status' => (string) ($unit->getStatus() ?? ''),
                    'ad_unit_code' => (string) ($unit->getAdUnitCode() ?? ''),
                    'target_window' => (string) ($unit->getTargetWindow() ?? ''),
                    'is_interstitial' => (bool) ($unit->getIsInterstitial() ?? false),
                    'is_native' => (bool) ($unit->getIsNative() ?? false),
                    'is_fluid' => (bool) ($unit->getIsFluid() ?? false),
                    'adsense_enabled' => $adSenseEnabled,
                    'last_modified' => $lastModified,
                ];
            }

            $totalCount = (int) ($page->getTotalResultSetSize() ?? 0);
            $offset += $pageSize;
        } while ($offset < $totalCount);

        return $adUnits;
    }

    /**
     * Create a new ad unit in GAM InventoryService.
     *
     * @param  array{
     *     name: string,
     *     parent_id: int,
     *     ad_unit_code?: string|null,
     *     description?: string|null,
     *     target_window?: 'TOP'|'BLANK'|null,
     *     explicitly_targeted?: bool,
     *     is_interstitial?: bool,
     *     is_native?: bool,
     *     is_fluid?: bool,
     *     adsense_enabled?: bool,
     *     applied_team_ids?: list<int>|null,
     *     sizes?: list<array{width: int, height: int}>|null,
     * }  $params
     * @return array{id: string, name: string, ad_unit_code: string, status: string, parent_id: string|null}
     */
    public function createAdUnit(array $params): array
    {
        $name = trim($params['name']);
        if ($name === '') {
            throw new InvalidArgumentException('Ad unit name is required.');
        }

        $parentId = (int) $params['parent_id'];
        if ($parentId <= 0) {
            throw new InvalidArgumentException('A valid parent_id is required.');
        }

        $adUnit = new AdUnit;
        $adUnit->setName($name);
        $adUnit->setParentId($parentId);
        $adUnit->setTargetWindow($params['target_window'] ?? 'TOP');

        if (! empty($params['ad_unit_code'])) {
            $adUnit->setAdUnitCode(trim($params['ad_unit_code']));
        }

        if (! empty($params['description'])) {
            $adUnit->setDescription(trim($params['description']));
        }

        if (isset($params['explicitly_targeted'])) {
            $adUnit->setExplicitlyTargeted((bool) $params['explicitly_targeted']);
        }

        if (isset($params['is_interstitial'])) {
            $adUnit->setIsInterstitial((bool) $params['is_interstitial']);
        }

        if (isset($params['is_native'])) {
            $adUnit->setIsNative((bool) $params['is_native']);
        }

        if (isset($params['is_fluid'])) {
            $adUnit->setIsFluid((bool) $params['is_fluid']);
        }

        if (isset($params['adsense_enabled'])) {
            $settings = new AdSenseSettings;
            $settings->setAdSenseEnabled((bool) $params['adsense_enabled']);
            $adUnit->setAdSenseSettings($settings);
        }

        if (! empty($params['applied_team_ids'])) {
            $adUnit->setAppliedTeamIds(array_map('intval', $params['applied_team_ids']));
        }

        if (! empty($params['sizes'])) {
            $adUnitSizes = array_map(function (array $s) {
                $size = new Size;
                $size->setWidth((int) $s['width']);
                $size->setHeight((int) $s['height']);
                $size->setIsAspectRatio(false);

                $adUnitSize = new AdUnitSize;
                $adUnitSize->setSize($size);
                $adUnitSize->setEnvironmentType('BROWSER');

                return $adUnitSize;
            }, $params['sizes']);
            $adUnit->setAdUnitSizes($adUnitSizes);
        }

        /** @var InventoryService $inventoryService */
        $inventoryService = $this->gamFactory->make(InventoryService::class);
        $created = $inventoryService->createAdUnits([$adUnit]);

        if (empty($created) || $created[0]->getId() === null) {
            throw new RuntimeException('GAM createAdUnits response did not contain the created ad unit.');
        }

        $result = $created[0];

        return [
            'id' => (string) $result->getId(),
            'name' => (string) ($result->getName() ?? ''),
            'ad_unit_code' => (string) ($result->getAdUnitCode() ?? ''),
            'status' => (string) ($result->getStatus() ?? ''),
            'parent_id' => $result->getParentId() !== null ? (string) $result->getParentId() : null,
        ];
    }

    private function gamDate(CarbonImmutable $date): Date
    {
        return new Date($date->year, $date->month, $date->day);
    }
}

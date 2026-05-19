<?php

namespace App\Services\Integrations\Adsense;

use App\Services\Integrations\Google\GamSoapClientFactory;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use RuntimeException;
use SoapClient;
use SoapFault;

class GamAdManagerReportService
{
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
        $reportDimensions = array_map(fn (string $dimension) => self::DIMENSIONS[$dimension], $requestedDimensions);
        $dateFrom = CarbonImmutable::parse($filters['date_from']);
        $dateTo = CarbonImmutable::parse($filters['date_to']);
        $currency = $filters['currency'] ?? null;

        $soapClient = $this->gamFactory->make(
            "https://ads.google.com/apis/ads/publisher/{$this->gamFactory->apiVersion()}/ReportService?wsdl"
        );
        $reportJobId = $this->runReportJob($soapClient, [
            'dimensions' => $reportDimensions,
            'columns' => self::REPORT_COLUMNS,
            'dateRangeType' => 'CUSTOM_DATE',
            'startDate' => $this->soapDate($dateFrom),
            'endDate' => $this->soapDate($dateTo),
            'timeZoneType' => 'PACIFIC',
            ...($currency ? ['reportCurrency' => $currency] : []),
        ]);

        $this->waitUntilReportCompletes($soapClient, $reportJobId);
        $downloadUrl = $this->getDownloadUrl($soapClient, $reportJobId);
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
            'dimensions' => ['date', 'custom_criteria'],
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

    private function extractCustomTargetingValue(string $criteria, string $key): ?string
    {
        if ($criteria === '') {
            return null;
        }

        $pattern = '/(?:^|[,;\\s])'.preg_quote($key, '/').'\\s*(?:=\\*|~\\*|=|~)\\s*([^,;\\s]+)/';
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
        $dimensions = $dimensions ?: ['date'];

        foreach ($dimensions as $dimension) {
            if (! array_key_exists($dimension, self::DIMENSIONS)) {
                throw new InvalidArgumentException("Unsupported GAM AdX dimension [{$dimension}].");
            }
        }

        return array_values(array_unique($dimensions));
    }

    /**
     * Run a report job in Google Ad Manager.
     *
     * @param  array<string, mixed>  $reportQuery
     */
    private function runReportJob(SoapClient $client, array $reportQuery): int
    {
        try {
            $response = $client->__soapCall('runReportJob', [[
                'reportJob' => [
                    'reportQuery' => $reportQuery,
                ],
            ]]);
        } catch (SoapFault $fault) {
            throw new RuntimeException('GAM runReportJob failed: '.$fault->getMessage(), previous: $fault);
        }

        $id = $response->rval->id ?? null;
        if (! is_numeric($id)) {
            throw new RuntimeException('GAM runReportJob response did not contain a report job ID.');
        }

        return (int) $id;
    }

    /**
     * Wait for a report job to complete in Google Ad Manager.
     */
    private function waitUntilReportCompletes(SoapClient $client, int $reportJobId): void
    {
        $attempts = max(1, (int) config('google.ad_manager.poll_attempts', 30));
        $interval = max(1, (int) config('google.ad_manager.poll_interval_seconds', 2));

        for ($attempt = 0; $attempt < $attempts; $attempt++) {
            try {
                $response = $client->__soapCall('getReportJobStatus', [[
                    'reportJobId' => $reportJobId,
                ]]);
            } catch (SoapFault $fault) {
                throw new RuntimeException('GAM getReportJobStatus failed: '.$fault->getMessage(), previous: $fault);
            }

            $status = (string) ($response->rval ?? '');
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

    /**
     * Get download URL for a report in Google Ad Manager.
     */
    private function getDownloadUrl(SoapClient $client, int $reportJobId): string
    {
        try {
            $response = $client->__soapCall('getReportDownloadUrlWithOptions', [[
                'reportJobId' => $reportJobId,
                'reportDownloadOptions' => [
                    'exportFormat' => 'CSV_DUMP',
                    'includeReportProperties' => false,
                    'includeTotalsRow' => false,
                    'useGzipCompression' => false,
                ],
            ]]);
        } catch (SoapFault $fault) {
            throw new RuntimeException('GAM getReportDownloadUrlWithOptions failed: '.$fault->getMessage(), previous: $fault);
        }

        $url = $response->rval ?? null;
        if (! is_string($url) || trim($url) === '') {
            throw new RuntimeException('GAM response did not contain a report download URL.');
        }

        return $url;
    }

    /**
     * Download CSV from Google Ad Manager.
     */
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
     * Parse CSV from Google Ad Manager.
     *
     *
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
     * Summarize rows from Google Ad Manager.
     *
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, int|float>
     */
    private function summarizeRows(array $rows): array
    {
        $impressions = array_sum(array_column($rows, 'ad_exchange_impressions'));
        $clicks = array_sum(array_column($rows, 'ad_exchange_clicks'));
        $responsesServed = array_sum(array_column($rows, 'ad_exchange_responses_served'));
        $revenueMicros = array_sum(array_column($rows, 'ad_exchange_revenue_micros'));

        return [
            'row_count' => count($rows),
            'ad_exchange_impressions' => (int) $impressions,
            'ad_exchange_clicks' => (int) $clicks,
            'ad_exchange_responses_served' => (int) $responsesServed,
            'ad_exchange_revenue_micros' => (int) $revenueMicros,
            'ad_exchange_revenue' => $this->microsToCurrency((int) $revenueMicros),
            'ad_exchange_average_ecpm' => $impressions > 0
                ? round(($this->microsToCurrency((int) $revenueMicros) / $impressions) * 1000, 6)
                : 0.0,
            'ad_exchange_ctr' => $impressions > 0 ? round(($clicks / $impressions) * 100, 4) : 0.0,
        ];
    }

    /**
     * Extract dimensions from a row.
     *
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

    /**
     * Normalize header.
     * GAM CSV_DUMP prefixes columns with "Dimension.", "Column.", or "DimensionAttribute."
     */
    private function normalizeHeader(string $header): string
    {
        $header = preg_replace('/^[A-Za-z]+\./', '', trim($header)) ?? $header;
        $header = strtolower($header);

        return str_replace([' ', '-'], '_', $header);
    }

    /**
     * Parse integer.
     */
    private function parseInteger(mixed $value): int
    {
        if ($value === null || $value === '') {
            return 0;
        }

        // Strip everything except digits and leading minus, but preserve only integer part
        $str = preg_replace('/\..*$/', '', (string) $value); // drop decimal part first
        $normalized = preg_replace('/[^\d\-]/', '', $str ?? '');

        return $normalized === '' ? 0 : (int) $normalized;
    }

    /**
     * Parse micros — GAM returns monetary values as integer micros in CSV_DUMP,
     * but may include a decimal point (e.g. "120000.0"). Round to nearest int.
     */
    private function parseMicros(mixed $value): int
    {
        if ($value === null || $value === '') {
            return 0;
        }

        return (int) round((float) $value);
    }

    /**
     * Convert micros to currency.
     */
    private function microsToCurrency(int $micros): float
    {
        return round($micros / 1_000_000, 6);
    }

    /**
     * Convert CarbonImmutable to SOAP date.
     *
     *
     * @return array{year: int, month: int, day: int}
     */
    private function soapDate(CarbonImmutable $date): array
    {
        return [
            'year' => (int) $date->year,
            'month' => (int) $date->month,
            'day' => (int) $date->day,
        ];
    }
}

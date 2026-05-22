<?php

namespace App\Services\Integrations\Adsense;

use App\Services\Integrations\Adsense\Traits\HasAdxRowHelpers;
use Carbon\CarbonImmutable;
use Google\Ads\AdManager\V1\Client\ReportServiceClient;
use Google\Ads\AdManager\V1\CreateReportRequest;
use Google\Ads\AdManager\V1\FetchReportResultRowsRequest;
use Google\Ads\AdManager\V1\GetReportRequest;
use Google\Ads\AdManager\V1\Report;
use Google\Ads\AdManager\V1\ReportDataTable\Row as ReportRow;
use Google\Ads\AdManager\V1\ReportDefinition;
use Google\Ads\AdManager\V1\ReportDefinition\DateRange as BetaDateRange;
use Google\Ads\AdManager\V1\ReportDefinition\DateRange\FixedDateRange;
use Google\Ads\AdManager\V1\ReportDefinition\Dimension;
use Google\Ads\AdManager\V1\ReportDefinition\Metric;
use Google\Ads\AdManager\V1\ReportDefinition\ReportType;
use Google\Ads\AdManager\V1\ReportDefinition\TimeZoneSource;
use Google\Ads\AdManager\V1\ReportValue;
use Google\Ads\AdManager\V1\RunReportRequest;
use Google\Ads\AdManager\V1\RunReportResponse;
use Google\ApiCore\OperationResponse;
use Google\Auth\Credentials\ServiceAccountCredentials;
use Google\Type\Date as GoogleTypeDate;
use InvalidArgumentException;
use RuntimeException;

/**
 * Fetches AdX/GAM revenue reports via the **Google Ad Manager Beta REST API**
 * (`googleads/ad-manager` library).
 *
 * Complements {@see GamAdManagerReportService} which uses the legacy SOAP API.
 * The row/summary shapes returned by both services are identical so callers
 * can switch between them transparently.
 */
class GamAdManagerBetaReportService
{
    use HasAdxRowHelpers;

    // -------------------------------------------------------------------------
    // Dimension & Metric maps
    // -------------------------------------------------------------------------

    /**
     * Maps human-readable dimension keys → `Dimension` enum constants.
     *
     * @var array<string, int>
     */
    private const DIMENSIONS = [
        'date' => Dimension::DATE,
        'ad_unit' => Dimension::AD_UNIT_NAME,
        'ad_unit_id' => Dimension::AD_UNIT_ID,
        'ad_unit_top_level' => Dimension::AD_UNIT_NAME_TOP_LEVEL,
        'ad_unit_id_top_level' => Dimension::AD_UNIT_ID_TOP_LEVEL,
        'custom_criteria' => Dimension::KEY_VALUES_NAME,
        'custom_targeting_value_id' => Dimension::KEY_VALUES_ID,
        'country' => Dimension::COUNTRY_NAME,
        'demand_channel' => Dimension::DEMAND_CHANNEL_NAME,
        'ad_exchange_product' => Dimension::ADX_PRODUCT_NAME,
        'ad_type' => Dimension::AD_TYPE_NAME,
    ];

    /** Metric constants included in every AdX revenue report. */
    private const METRICS = [
        Metric::AD_EXCHANGE_IMPRESSIONS,
        Metric::AD_EXCHANGE_CLICKS,
        Metric::AD_EXCHANGE_REVENUE,
        Metric::AD_EXCHANGE_AVERAGE_ECPM,
        Metric::AD_EXCHANGE_RESPONSES_SERVED,
    ];

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Create a new transient report and run it immediately.
     *
     * Use this when you want a one-off report with a specific date range and
     * dimension set and do not need the report to persist in GAM.
     *
     * Flow:
     *  1. `CreateReport` — register a new `Report` with its `ReportDefinition`.
     *  2. `RunReport`    — execute it asynchronously (LRO).
     *  3. Poll until done.
     *  4. `FetchReportResultRows` — paginate through all rows.
     *
     * @param  array{date_from: string, date_to: string, dimensions?: list<string>|null, currency?: string|null}  $filters
     * @return array<string, mixed>
     */
    public function fetchAdxRevenue(array $filters): array
    {
        $requestedDimensions = $this->resolveDimensions($filters['dimensions'] ?? null);
        $dateFrom = CarbonImmutable::parse($filters['date_from']);
        $dateTo = CarbonImmutable::parse($filters['date_to']);
        $currency = $filters['currency'] ?? null;

        $client = $this->makeClient();
        $networkCode = (string) config('google.ad_manager.network_code');
        $parentName = ReportServiceClient::networkName($networkCode);

        // Build the ReportDefinition
        $reportDef = (new ReportDefinition)
            ->setDimensions(array_values($requestedDimensions))
            ->setMetrics(self::METRICS)
            ->setReportType(ReportType::HISTORICAL)
            ->setDateRange($this->fixedDateRange($dateFrom, $dateTo))
            ->setTimeZoneSource(TimeZoneSource::PROVIDED)
            ->setTimeZone('America/Los_Angeles');

        if ($currency !== null) {
            $reportDef->setCurrencyCode($currency);
        }

        // Create the Report in GAM
        $report = (new Report)
            ->setReportDefinition($reportDef)
            ->setDisplayName('adx_revenue_beta_' . now()->format('YmdHis'));

        $createRequest = CreateReportRequest::build($parentName, $report);
        $createdReport = $client->createReport($createRequest);
        $reportName = $createdReport->getName();

        // Run the report (LRO) and wait
        $operation = $client->runReport(RunReportRequest::build($reportName));
        $this->waitForOperation($operation);

        /** @var RunReportResponse $runResponse */
        $runResponse = $operation->getResult();
        $resultName = $runResponse->getReportResult();

        $dimensionKeys = array_keys($requestedDimensions);
        $rows = $this->fetchAllRows($client, $resultName, $dimensionKeys);

        return [
            'source' => 'google_ad_manager_beta_adx',
            'network_code' => $networkCode,
            'date_from' => $dateFrom->toDateString(),
            'date_to' => $dateTo->toDateString(),
            'currency' => $currency,
            'dimensions' => $dimensionKeys,
            'report_name' => $reportName,
            'summary' => $this->summarizeRows($rows),
            'rows' => $rows,
        ];
    }

    /**
     * Run an **existing** saved GAM report by its numeric ID.
     *
     * This skips `CreateReport` entirely and is the correct approach when you
     * already have a report configured in GAM (e.g. from the GAM UI):
     *   https://admanager.google.com/{networkCode}#reports/interactive/detail/report_id={reportId}
     *
     * Flow:
     *  1. `GetReport`  — retrieve the Report resource including its ReportDefinition
     *                    so we know the column/dimension order.
     *  2. `RunReport`  — trigger an async execution (LRO).
     *  3. Poll until done.
     *  4. `FetchReportResultRows` — paginate through all rows.
     *
     * @param  int|string  $reportId  Numeric report ID (e.g. 7556487270)
     * @param  array{date_from?: string, date_to?: string}  $filters  Optional overrides
     * @return array<string, mixed>
     */
    public function fetchAdxRevenueById(int|string $reportId, array $filters = []): array
    {
        $client = $this->makeClient();
        $networkCode = (string) config('google.ad_manager.network_code');
        $reportName = ReportServiceClient::reportName($networkCode, (string) $reportId);

        // Retrieve the existing Report to read its dimension order
        $getRequest = new GetReportRequest;
        $getRequest->setName($reportName);
        $report = $client->getReport($getRequest);

        if (! empty($filters['date_from']) && ! empty($filters['date_to'])) {
            $dateFrom = CarbonImmutable::parse($filters['date_from']);
            $dateTo = CarbonImmutable::parse($filters['date_to']);

            $dateRange = (new BetaDateRange)->setFixed(
                (new FixedDateRange)
                    ->setStartDate(
                        (new GoogleTypeDate)->setYear($dateFrom->year)->setMonth($dateFrom->month)->setDay($dateFrom->day)
                    )
                    ->setEndDate(
                        (new GoogleTypeDate)->setYear($dateTo->year)->setMonth($dateTo->month)->setDay($dateTo->day)
                    )
            );

            $reportDef = $report->getReportDefinition();
            if ($reportDef) {
                $reportDef->setDateRange($dateRange);
            }

            $clonedReport = (new Report)
                ->setReportDefinition($reportDef)
                ->setDisplayName($report->getDisplayName() . '_' . now()->format('YmdHis'));

            $createRequest = CreateReportRequest::build(ReportServiceClient::networkName($networkCode), $clonedReport);
            $report = $client->createReport($createRequest);
            $reportName = $report->getName();
        }

        $dimensionKeys = $this->dimensionKeysFromReport($report);

        // Run (LRO) and wait
        $operation = $client->runReport(RunReportRequest::build($reportName));
        $this->waitForOperation($operation);

        /** @var RunReportResponse $runResponse */
        $runResponse = $operation->getResult();
        $resultName = $runResponse->getReportResult();

        $rows = $this->fetchAllRows($client, $resultName, $dimensionKeys);

        return [
            'source' => 'google_ad_manager_beta_adx',
            'network_code' => $networkCode,
            'report_id' => (string) $reportId,
            'report_name' => $reportName,
            'display_name' => $report->getDisplayName(),
            'dimension_keys' => $dimensionKeys,
            'summary' => $this->summarizeRows($rows),
            'rows' => $rows,
        ];
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Build a `ReportServiceClient` authenticated with the same service-account
     * JSON used by the legacy SOAP factory.
     */
    private function makeClient(): ReportServiceClient
    {
        $jsonPath = storage_path(
            (string) config('google.ad_manager.service_account_json_path')
        );

        if (! file_exists($jsonPath)) {
            throw new RuntimeException(
                "GAM service account JSON not found at [{$jsonPath}]."
            );
        }

        $scopes = [
            'https://www.googleapis.com/auth/admanager',
            'https://www.googleapis.com/auth/admanager.readonly',
        ];

        $credentials = new ServiceAccountCredentials(
            $scopes,
            json_decode((string) file_get_contents($jsonPath), true)
        );

        return new ReportServiceClient(['credentials' => $credentials]);
    }

    /**
     * Resolve and validate dimension keys, returning an ordered map of
     * `key => Dimension enum value`.
     *
     * @param  list<string>|null  $dimensions
     * @return array<string, int>
     */
    private function resolveDimensions(?array $dimensions): array
    {
        $dimensions = $dimensions ?: ['date'];

        $result = [];
        foreach ($dimensions as $dim) {
            if (! array_key_exists($dim, self::DIMENSIONS)) {
                throw new InvalidArgumentException(
                    "Unsupported Beta GAM dimension [{$dim}]. " .
                        'Supported: ' . implode(', ', array_keys(self::DIMENSIONS))
                );
            }
            $result[$dim] = self::DIMENSIONS[$dim];
        }

        return $result;
    }

    /**
     * Extract an ordered list of human-readable dimension keys from an
     * existing Report's ReportDefinition.
     *
     * Unknown enum values fall back to `"dim_{n}"` so parsing is never blocked.
     *
     * @return list<string>
     */
    private function dimensionKeysFromReport(Report $report): array
    {
        $flipMap = array_flip(self::DIMENSIONS); // int => string
        $definition = $report->getReportDefinition();

        if ($definition === null) {
            return [];
        }

        $keys = [];
        foreach ($definition->getDimensions() as $idx => $enumValue) {
            $keys[] = $flipMap[$enumValue] ?? 'dim_' . $idx;
        }

        return $keys;
    }

    /**
     * Build a `DateRange` using a fixed start and end date.
     */
    private function fixedDateRange(CarbonImmutable $from, CarbonImmutable $to): BetaDateRange
    {
        $startDate = (new GoogleTypeDate)
            ->setYear($from->year)
            ->setMonth($from->month)
            ->setDay($from->day);

        $endDate = (new GoogleTypeDate)
            ->setYear($to->year)
            ->setMonth($to->month)
            ->setDay($to->day);

        $fixed = (new FixedDateRange)
            ->setStartDate($startDate)
            ->setEndDate($endDate);

        return (new BetaDateRange)->setFixed($fixed);
    }

    /**
     * Poll a long-running operation until it completes or the timeout is reached.
     *
     * @param  OperationResponse  $operation
     */
    private function waitForOperation(mixed $operation): void
    {
        $attempts = max(1, (int) config('google.ad_manager.poll_attempts', 30));
        $interval = max(1, (int) config('google.ad_manager.poll_interval_seconds', 5));

        for ($i = 0; $i < $attempts; $i++) {
            $operation->reload();

            if ($operation->isDone()) {
                if ($operation->operationSucceeded()) {
                    return;
                }

                $error = $operation->getError();
                throw new RuntimeException(
                    'Beta GAM RunReport failed: ' .
                        ($error !== null ? $error->getMessage() : 'unknown error')
                );
            }

            sleep($interval);
        }

        throw new RuntimeException('Beta GAM RunReport did not complete within the polling timeout.');
    }

    /**
     * Page through `FetchReportResultRows` and return all rows.
     *
     * @param  list<string>  $dimensionKeys
     * @return list<array<string, mixed>>
     */
    private function fetchAllRows(
        ReportServiceClient $client,
        string $resultName,
        array $dimensionKeys
    ): array {
        $rows = [];
        $pageToken = null;
        $pageSize = 10_000;

        do {
            $request = (new FetchReportResultRowsRequest)
                ->setName($resultName)
                ->setPageSize($pageSize);

            if ($pageToken !== null) {
                $request->setPageToken($pageToken);
            }

            $response = $client->fetchReportResultRows($request);

            $pageToken = $response->getNextPageToken();

            foreach ($response->getRows() as $row) {
                $parsed = $this->parseRow($row, $dimensionKeys);
                if ($parsed !== null) {
                    $rows[] = $parsed;
                }
            }
        } while ($pageToken !== '');

        return $rows;
    }

    /**
     * Parse a single protobuf `Row` into the normalized row shape.
     *
     * Metrics order (matches {@see METRICS}):
     *  [0] AD_EXCHANGE_IMPRESSIONS
     *  [1] AD_EXCHANGE_CLICKS
     *  [2] AD_EXCHANGE_REVENUE         (micro-currency int)
     *  [3] AD_EXCHANGE_AVERAGE_ECPM    (micro-currency int)
     *  [4] AD_EXCHANGE_RESPONSES_SERVED
     *
     * @param  list<string>  $dimensionKeys
     * @return array<string, mixed>|null
     */
    private function parseRow(ReportRow $row, array $dimensionKeys): ?array
    {
        // Dimensions
        $dimValues = iterator_to_array($row->getDimensionValues());
        $dimensions = [];
        foreach ($dimensionKeys as $idx => $key) {
            $dimensions[$key] = isset($dimValues[$idx])
                ? $this->extractReportValue($dimValues[$idx])
                : null;
        }

        // Metrics (primary values of the first / only date-range group)
        $metricGroups = $row->getMetricValueGroups();
        $primaryValues = isset($metricGroups[0])
            ? iterator_to_array($metricGroups[0]->getPrimaryValues())
            : [];

        $impressions = $this->reportInt($primaryValues[0] ?? null);
        $clicks = $this->reportInt($primaryValues[1] ?? null);
        $revenue = $this->reportCurrencyFloat($primaryValues[2] ?? null);
        $ecpm = $this->reportCurrencyFloat($primaryValues[3] ?? null);
        $responsesServed = $this->reportInt($primaryValues[4] ?? null);

        return [
            'dimensions' => $dimensions,
            'ad_exchange_impressions' => $impressions,
            'ad_exchange_clicks' => $clicks,
            'ad_exchange_responses_served' => $responsesServed,
            'ad_exchange_revenue' => $revenue,
            'ad_exchange_average_ecpm' => $ecpm,
            'ad_exchange_ctr' => $impressions > 0
                ? round(($clicks / $impressions) * 100, 4)
                : 0.0,
        ];
    }

    /**
     * Extract a scalar value from a `ReportValue` protobuf oneof.
     */
    private function extractReportValue(ReportValue $v): mixed
    {
        return match ($v->getValue()) {
            'int_value' => (string) $v->getIntValue(),
            'double_value' => $v->getDoubleValue(),
            'string_value' => $v->getStringValue(),
            'bool_value' => $v->getBoolValue(),
            default => null,
        };
    }

    /**
     * Read an integer (or rounded double) from a nullable `ReportValue`.
     * Monetary values are returned by the Beta API as micro-currency integers.
     */
    private function reportInt(?ReportValue $v): int
    {
        if ($v === null) {
            return 0;
        }

        return match ($v->getValue()) {
            'int_value' => (int) $v->getIntValue(),
            'double_value' => (int) round($v->getDoubleValue()),
            default => 0,
        };
    }

    /**
     * Read a monetary value from `ReportValue` as standard currency (float).
     * The Beta API returns monetary values as standard currency (e.g., 1.99)
     * inside `double_value`.
     */
    private function reportCurrencyFloat(?ReportValue $v): float
    {
        if ($v === null) {
            return 0.0;
        }

        return match ($v->getValue()) {
            'int_value' => (float) $v->getIntValue(),
            'double_value' => $v->getDoubleValue(),
            default => 0.0,
        };
    }
}

<?php

namespace App\Console\Commands;

use App\Services\Integrations\Adsense\GamAdManagerBetaReportService;
use Illuminate\Console\Command;
use Throwable;

class TestGamBetaByIdCommand extends Command
{
    protected $signature = 'adx:test-gam-beta-by-id
        {report_id : Numeric GAM report ID (e.g. 7556487270)}
        {--limit=20 : Max rows to display in the table}
        {--date-from= : Optional date from}
        {--date-to= : Optional date to}';

    protected $description = 'Fetch an existing GAM report by ID using the Beta REST API and display the result';

    public function handle(GamAdManagerBetaReportService $gamService): int
    {
        $reportId = (string) $this->argument('report_id');
        $limit = (int) $this->option('limit');
        $dateFrom = $this->option('date-from') ?: null;
        $dateTo = $this->option('date-to') ?: null;

        $this->info("Fetching GAM Beta report ID [{$reportId}]…");

        $filters = [];
        if ($dateFrom !== null) {
            $filters['date_from'] = $dateFrom;
        }
        if ($dateTo !== null) {
            $filters['date_to'] = $dateTo;
        }

        try {
            $result = $gamService->fetchAdxRevenueById($reportId, $filters);
        } catch (Throwable $e) {
            $this->error('Failed: ' . $e->getMessage());
            $this->line($e->getTraceAsString());

            return Command::FAILURE;
        }

        $summary = $result['summary'] ?? [];
        $rows = $result['rows'] ?? [];

        $this->newLine();
        $this->info('Report : ' . ($result['display_name'] ?? $result['report_name'] ?? '-'));
        $this->info('Source : ' . ($result['source'] ?? '-'));

        $this->newLine();
        $this->info('=== Summary ===');
        $this->table(
            ['Metric', 'Value'],
            [
                ['Rows returned',    count($rows)],
                ['Impressions',      number_format($summary['ad_exchange_impressions'] ?? 0)],
                ['Clicks',           number_format($summary['ad_exchange_clicks'] ?? 0)],
                ['Responses served', number_format($summary['ad_exchange_responses_served'] ?? 0)],
                ['Revenue',          number_format($summary['ad_exchange_revenue'])],
                ['Avg eCPM',         number_format($summary['ad_exchange_average_ecpm'])],
                ['CTR (%)',          $summary['ad_exchange_ctr'] ?? 0],
            ]
        );

        if (empty($rows)) {
            $this->warn('No rows returned.');

            return Command::SUCCESS;
        }

        $dimensionKeys = $result['dimension_keys'] ?? array_keys(($rows[0]['dimensions'] ?? []));

        $this->newLine();

        $headers = array_merge(
            $dimensionKeys,
            ['Impressions', 'Revenue', 'eCPM']
        );

        $tableRows = array_map(function (array $row) use ($dimensionKeys): array {
            $dims = array_map(
                fn(string $k) => $row['dimensions'][$k] ?? '-',
                $dimensionKeys
            );

            return array_merge($dims, [
                number_format($row['ad_exchange_impressions'] ?? 0),
                number_format($row['ad_exchange_revenue'] ?? 0, 6),
                number_format($row['ad_exchange_average_ecpm'] ?? 0, 6),
            ]);
        }, $rows);

        $this->table($headers, $tableRows);

        return Command::SUCCESS;
    }
}

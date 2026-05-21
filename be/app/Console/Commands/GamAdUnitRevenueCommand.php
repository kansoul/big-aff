<?php

namespace App\Console\Commands;

use App\Services\Integrations\Adsense\GamAdManagerReportService;
use Illuminate\Console\Command;
use Throwable;

class GamAdUnitRevenueCommand extends Command
{
    protected $signature = 'gam:ad-unit-revenue
                            {--date-from= : Start date YYYY-MM-DD, defaults to yesterday}
                            {--date-to=   : End date YYYY-MM-DD, defaults to yesterday}
                            {--ad-unit-ids= : Comma-separated GAM ad unit IDs to filter}
                            {--currency=USD : Currency code}';

    protected $description = 'Fetch AdX revenue broken down by ad unit from Google Ad Manager';

    public function handle(GamAdManagerReportService $service): int
    {
        $yesterday = now()->subDay()->toDateString();
        $dateFrom = $this->option('date-from') ?: $yesterday;
        $dateTo = $this->option('date-to') ?: $yesterday;
        $currency = $this->option('currency') ?: 'USD';
        $adUnitIds = $this->option('ad-unit-ids')
            ? array_map('trim', explode(',', $this->option('ad-unit-ids')))
            : [];

        $this->info("Fetching ad unit revenue [{$dateFrom} → {$dateTo}] ...");

        try {
            $report = $service->fetchAdxRevenueByAdUnit([
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'currency' => $currency,
                'ad_unit_ids' => $adUnitIds ?: null,
            ]);
        } catch (Throwable $e) {
            $this->error('Failed: '.$e->getMessage());

            return self::FAILURE;
        }

        $rows = $report['rows'] ?? [];

        if (empty($rows)) {
            $this->warn('No data returned for this date range.');

            return self::SUCCESS;
        }

        $this->table(
            ['Date', 'Ad Unit ID', 'Ad Unit Name', 'Custom Criteria', 'Impressions', 'Clicks', 'CTR %', 'eCPM', "Revenue ({$currency})"],
            array_map(fn (array $row) => [
                $row['dimensions']['date'] ?? '—',
                $row['ad_unit_id'],
                $row['ad_unit_name'] ?: ($row['dimensions']['ad_unit_name'] ?? '—'),
                $row['custom_criteria'] ?: '—',
                number_format((int) $row['ad_exchange_impressions']),
                number_format((int) $row['ad_exchange_clicks']),
                number_format((float) $row['ad_exchange_ctr'], 4),
                number_format((float) $row['ad_exchange_average_ecpm'], 4),
                number_format((float) $row['ad_exchange_revenue'], 6),
            ], $rows),
        );

        $summary = $report['summary'];
        $this->newLine();
        $this->line('Summary:');
        $this->line('  Rows        : '.count($rows));
        $this->line('  Impressions : '.number_format((int) $summary['ad_exchange_impressions']));
        $this->line('  Clicks      : '.number_format((int) $summary['ad_exchange_clicks']));
        $this->line('  Revenue     : '.number_format((float) $summary['ad_exchange_revenue'], 6).' '.$currency);
        $this->line('  Avg eCPM    : '.number_format((float) $summary['ad_exchange_average_ecpm'], 6));

        return self::SUCCESS;
    }
}

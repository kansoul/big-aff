<?php

namespace App\Console\Commands;

use App\Models\AdxCampaign;
use App\Services\Integrations\Adsense\GamAdManagerReportService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Throwable;

class TestGamRevenueCommand extends Command
{
    protected $signature = 'adx:test-gam-revenue
        {date? : Date to fetch (Y-m-d). Defaults to yesterday}
        {--campaign= : Filter by a specific campaign ID (gam_custom_value)}
        {--limit=10 : Max rows to display}';

    protected $description = 'Fetch GAM AdX revenue for a given date and display the result — does NOT write to the database';

    public function handle(GamAdManagerReportService $gamService): int
    {
        $date = $this->argument('date')
            ? Carbon::parse($this->argument('date'))->toDateString()
            : Carbon::yesterday()->toDateString();

        $campaignFilter = $this->option('campaign');
        $limit = (int) $this->option('limit');

        $campaignIds = $campaignFilter
            ? [$campaignFilter]
            : AdxCampaign::query()
            ->whereNotNull('gam_custom_value_id')
            ->whereNotNull('gam_custom_value')
            ->pluck('gam_custom_value')
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (empty($campaignIds)) {
            $this->warn('No campaigns with gam_custom_value found. Make sure adx_campaigns have gam_custom_value set.');

            return Command::FAILURE;
        }

        $this->info("Fetching GAM revenue for date={$date} with " . count($campaignIds) . ' campaign targeting value(s)...');

        try {
            $report = $gamService->fetchAdxRevenueByCustomTargeting([
                'date_from' => $date,
                'date_to' => $date,
                'gam_custom_key' => 'campid',
                'custom_targeting_values' => $campaignIds,
                'currency' => 'USD',
            ]);
        } catch (Throwable $e) {
            $this->error('GAM fetch failed: ' . $e->getMessage());

            return Command::FAILURE;
        }

        $summary = $report['summary'] ?? [];
        $rows = $report['rows'] ?? [];

        $this->newLine();
        $this->info('=== Summary ===');
        $this->table(
            ['Metric', 'Value'],
            [
                ['Row count', $summary['row_count'] ?? 0],
                ['Impressions', number_format($summary['ad_exchange_impressions'] ?? 0)],
                ['Clicks', number_format($summary['ad_exchange_clicks'] ?? 0)],
                ['Responses served', number_format($summary['ad_exchange_responses_served'] ?? 0)],
                ['Revenue (USD)', number_format($summary['ad_exchange_revenue'] ?? 0, 6)],
                ['Average eCPM', number_format($summary['ad_exchange_average_ecpm'] ?? 0, 6)],
                ['CTR (%)', $summary['ad_exchange_ctr'] ?? 0],
            ]
        );

        if (empty($rows)) {
            $this->warn('No rows returned from GAM for this date/targeting combination.');

            return Command::SUCCESS;
        }

        $this->newLine();
        $this->info("=== Rows (showing up to {$limit}) ===");

        $displayed = array_slice($rows, 0, $limit);
        $this->table(
            ['Date', 'Campaign ID', 'Ad Unit', 'Impressions', 'Revenue (USD)', 'eCPM'],
            array_map(fn(array $row) => [
                $row['dimensions']['date_pt'] ?? '-',
                $row['campaign_id'] ?? '-',
                $row['dimensions']['ad_unit'] ?? '-',
                number_format($row['ad_exchange_impressions'] ?? 0),
                number_format($row['ad_exchange_revenue'] ?? 0, 6),
                number_format($row['ad_exchange_average_ecpm'] ?? 0, 6),
            ], $displayed)
        );

        if (count($rows) > $limit) {
            $this->line('... and ' . (count($rows) - $limit) . ' more rows (increase --limit to see all).');
        }

        return Command::SUCCESS;
    }
}

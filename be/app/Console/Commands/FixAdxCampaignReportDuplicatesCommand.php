<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class FixAdxCampaignReportDuplicatesCommand extends Command
{
    protected $signature = 'adx:fix-campaign-report-duplicates
        {--dry-run : Show what would be deleted without actually deleting}';

    protected $description = 'Remove duplicate adx_campaign_reports rows, keeping the most complete record per (date, source, account_id, campaign_id)';

    public function handle(): int
    {
        $isDryRun = $this->option('dry-run');

        $dupeGroups = DB::table('adx_campaign_reports')
            ->select('date', 'source', 'account_id', 'campaign_id')
            ->groupBy('date', 'source', 'account_id', 'campaign_id')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        if ($dupeGroups->isEmpty()) {
            $this->info('No duplicate records found.');

            return Command::SUCCESS;
        }

        $this->info("Found {$dupeGroups->count()} duplicate group(s).".($isDryRun ? ' [DRY RUN]' : ''));

        $headers = ['Keep ID', 'Delete IDs', 'Campaign ID', 'Date'];
        $tableRows = [];
        $totalDeleted = 0;

        foreach ($dupeGroups as $group) {
            $records = DB::table('adx_campaign_reports')
                ->where('date', $group->date)
                ->where('source', $group->source)
                ->where('account_id', $group->account_id)
                ->where('campaign_id', $group->campaign_id)
                ->orderByRaw('adx_link_data_id IS NULL ASC') // nulls last — prefer record with link data
                ->orderByDesc('id')
                ->get();

            $keepId = $records->first()->id;
            $deleteIds = $records->skip(1)->pluck('id')->all();

            if (! $isDryRun) {
                DB::table('adx_campaign_reports')->whereIn('id', $deleteIds)->delete();
            }

            $totalDeleted += count($deleteIds);
            $tableRows[] = [$keepId, implode(', ', $deleteIds), $group->campaign_id, $group->date];
        }

        $this->table($headers, $tableRows);
        $this->info('Total records '.($isDryRun ? 'to delete' : 'deleted').": {$totalDeleted}");

        return Command::SUCCESS;
    }
}

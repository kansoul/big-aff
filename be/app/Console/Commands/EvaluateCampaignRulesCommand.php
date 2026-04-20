<?php

namespace App\Console\Commands;

use App\Jobs\EvaluateCampaignRuleJob;
use App\Models\Campaign;
use App\Models\CampaignApplyRule;
use App\Models\CampaignReport;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class EvaluateCampaignRulesCommand extends Command
{
    protected $signature = 'campaign-rules:evaluate
        {--date= : Date to evaluate in Y-m-d format (defaults to today)}';

    protected $description = 'Dispatch campaign rule evaluation jobs for all campaigns with active rules';

    public function handle(): int
    {
        $date = $this->option('date') ?? now()->toDateString();

        $this->info("Evaluating campaign rules for date: {$date}");

        try {
            $campaignIds = CampaignApplyRule::query()
                ->where('sourceable_type', Campaign::class)
                ->whereHas(
                    'campaignRule',
                    fn ($q) => $q->where('is_active', true)
                        ->where(fn ($q2) => $q2->whereNull('expired_at')->orWhere('expired_at', '>=', now()))
                )
                ->distinct()
                ->pluck('sourceable_id');

            if ($campaignIds->isEmpty()) {
                $this->line('No campaigns with active rules found.');

                return Command::SUCCESS;
            }

            $this->line("Found {$campaignIds->count()} campaign(s) with active rules.");

            $campaigns = Campaign::whereIn('id', $campaignIds)->get()->keyBy('id');

            // Aggregate today's report metrics keyed by external campaign_id
            $reports = CampaignReport::query()
                ->whereDate('date_start', $date)
                ->whereIn('campaign_id', $campaigns->pluck('campaign_id'))
                ->get()
                ->groupBy('campaign_id')
                ->map(function ($rows) {
                    $spend = $rows->a_spend ?? 0;
                    $revenue = $rows->r_revenue ?? 0;
                    $profit = $revenue - $spend;
                    $roi = $spend > 0 ? ($profit / $spend) * 100 : 0;

                    return compact('spend', 'revenue', 'profit', 'roi');
                });

            $dispatched = 0;

            foreach ($campaigns as $campaign) {
                try {
                    $metrics = $reports->get($campaign->campaign_id);

                    if (! $metrics) {
                        continue;
                    }

                    EvaluateCampaignRuleJob::dispatch($campaign, $metrics);
                    $dispatched++;
                } catch (Throwable $e) {
                    Log::channel('tracking_events')->error('[EvaluateCampaignRulesCommand] Campaign error', [
                        'campaign_id' => $campaign->id,
                        'error' => $e->getMessage(),
                    ]);
                    $this->error("Error for campaign {$campaign->id}: {$e->getMessage()}");
                }
            }

            $this->info("Dispatched {$dispatched} evaluation job(s).");
        } catch (Throwable $e) {
            Log::channel('tracking_events')->error('[EvaluateCampaignRulesCommand] Fatal error', [
                'error' => $e->getMessage(),
            ]);
            $this->error("Fatal error: {$e->getMessage()}");

            return Command::FAILURE;
        }

        return Command::SUCCESS;
    }
}

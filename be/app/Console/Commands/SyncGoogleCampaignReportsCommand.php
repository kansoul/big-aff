<?php

namespace App\Console\Commands;

use App\Enums\AdsType;
use App\Models\Account;
use App\Models\Campaign;
use App\Models\InsightReport;
use App\Services\Integrations\Google\GoogleAdsService;
use App\Services\MainSystem\MainSystemSyncService;
use App\Support\ReportOwner\ReportOwnerResolver;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncGoogleCampaignReportsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'google-ads:sync-campaign-reports
        {account_id : Comma-separated Google account_id(s) to fetch}
        {--start-date= : Start date (Y-m-d), defaults to 7 days ago}
        {--end-date= : End date (Y-m-d), defaults to today}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fetch & sync Google campaign insights (without conversions) for given accounts, bypassing main-team scope';

    /**
     * Execute the console command.
     */
    public function handle(): void
    {
        $accountIds = collect(explode(',', $this->argument('account_id')))
            ->map(fn($id) => trim($id))
            ->filter()
            ->values()
            ->all();

        $startDate = $this->option('start-date') ?: now()->subDays(7)->toDateString();
        $endDate = $this->option('end-date') ?: now()->toDateString();

        $this->info('Syncing Google accounts [' . implode(', ', $accountIds) . "] from {$startDate} to {$endDate}...");

        $accounts = Account::whereIn('account_id', $accountIds)
            ->where('ads_type', AdsType::GOOGLE->value)
            ->where('status', 'ACTIVE')
            ->get();

        if ($accounts->isEmpty()) {
            $this->warn('No matching ACTIVE Google accounts found.');

            return;
        }

        $service = app(GoogleAdsService::class);
        $ownerResolver = new ReportOwnerResolver;

        foreach ($accounts as $account) {
            try {
                $response = $service->getCampaignInsightsWithoutConversions($account->account_id, $startDate, $endDate);

                if (! $response || empty($response['insights'])) {
                    $this->line("No insights for account {$account->account_id}.");

                    continue;
                }

                $insights = $response['insights'];
                $campaigns = $response['campaigns'];

                $owner = $ownerResolver->forAccountId($account->account_id);

                DB::transaction(function () use ($insights, $campaigns, $owner) {
                    if (! empty($campaigns)) {
                        Campaign::upsert(
                            $campaigns,
                            ['campaign_id'],
                            ['campaign_name', 'daily_budget', 'lifetime_budget', 'status', 'start_time', 'stop_time', 'created_time', 'updated_time', 'created_at', 'updated_at']
                        );
                    }

                    $insightsData = array_map(function ($insight) use ($owner) {
                        return [
                            'account_id' => $insight['account_id'],
                            'campaign_id' => $insight['campaign_id'],
                            'date_start' => $insight['date_start'],
                            'impressions' => $insight['impressions'],
                            'clicks' => $insight['clicks'],
                            'reach' => $insight['reach'],
                            'cpa' => $insight['cpa'],
                            'search_clicks' => $insight['link_clicks'],
                            'ctr_link' => $insight['ctr_link'],
                            'cpc_link' => $insight['cpc_link'],
                            'spend' => $insight['spend'],
                            'cpc' => $insight['cpc'],
                            'cpm' => $insight['cpm'],
                            'ctr' => $insight['ctr'],
                            'frequency' => $insight['frequency'],
                            'spend_type' => $insight['spend_type'],
                            'owner_user_id' => $owner['owner_user_id'] ?? null,
                            'owner_main_team_id' => $owner['owner_main_team_id'] ?? null,
                            'updated_at' => now(),
                        ];
                    }, $insights);

                    $baseColumns = ['impressions', 'clicks', 'reach', 'cpa', 'search_clicks', 'ctr_link', 'cpc_link', 'spend', 'cpc', 'cpm', 'ctr', 'frequency', 'spend_type', 'updated_at'];

                    InsightReport::upsert(
                        $insightsData,
                        ['account_id', 'campaign_id', 'date_start'],
                        array_merge($baseColumns, ['owner_user_id', 'owner_main_team_id']),
                    );

                    return $insightsData;
                });


                $this->info("Synced account {$account->account_id}.");
            } catch (Throwable $th) {
                Log::error('Error processing Google account (without conversions) ' . $account->account_id . ': ' . $th->getMessage());
                Log::error($th->getTraceAsString());
                $this->error("Error syncing account {$account->account_id}: {$th->getMessage()}");

                continue;
            }
        }

        $this->info('Done.');
    }
}

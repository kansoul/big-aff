<?php

namespace App\Actions\MainSystem;

use App\Services\MainSystem\MainSystemHttpClient;
use Illuminate\Support\Facades\Log;

class SendMainSystemInsightReportsAction
{
    public function __construct(
        private readonly MainSystemHttpClient $client,
    ) {}

    /**
     * @param  list<array<string, mixed>>  $accounts
     * @param  list<array<string, mixed>>  $campaigns
     * @param  list<array<string, mixed>>  $insights
     */
    public function execute(array $accounts, array $campaigns, array $insights): void
    {
        if (! $this->client->shouldPush()) {
            Log::channel('sync_reports')->warning('[MainSystemSync] Insight send skipped in job: push disabled', [
                'blockers' => $this->client->pushBlockers(),
                'accounts_count' => count($accounts),
                'campaigns_count' => count($campaigns),
                'insights_count' => count($insights),
            ]);

            return;
        }

        if ($insights === []) {
            Log::channel('sync_reports')->info('[MainSystemSync] Insight send skipped in job: empty insights', [
                'accounts_count' => count($accounts),
                'campaigns_count' => count($campaigns),
            ]);

            return;
        }

        $this->client->post('api/main-system/insight-reports', [
            'main_team_id' => (int) config('main_system.main_team_id'),
            'accounts' => $accounts,
            'campaigns' => $campaigns,
            'insights' => $insights,
        ]);
    }
}

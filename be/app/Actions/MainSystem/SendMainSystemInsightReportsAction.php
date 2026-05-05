<?php

namespace App\Actions\MainSystem;

use App\Services\MainSystem\MainSystemHttpClient;

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
        if (! $this->client->shouldPush() || $insights === []) {
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

<?php

namespace App\Actions\MainSystem;

use App\Models\Channel;
use App\Services\MainSystem\MainSystemHttpClient;
use Illuminate\Support\Facades\Log;

class SendMainSystemChannelsAction
{
    public function __construct(
        private readonly MainSystemHttpClient $client,
    ) {}

    public function execute(): void
    {
        if (! $this->client->shouldPush()) {
            Log::channel('sync_reports')->warning('[MainSystemSync] Channel send skipped in job: push disabled', [
                'blockers' => $this->client->pushBlockers(),
            ]);

            return;
        }

        $channels = Channel::query()
            ->orderBy('id')
            ->get(['code', 'name', 'is_active'])
            ->map(fn (Channel $channel) => [
                'code' => $channel->code,
                'name' => $channel->name,
                'is_active' => $channel->is_active,
            ])
            ->values()
            ->all();

        if ($channels === []) {
            Log::channel('sync_reports')->info('[MainSystemSync] Channel send skipped in job: empty channels');

            return;
        }

        $this->client->post('api/main-system/channels', [
            'main_team_id' => (int) config('main_system.main_team_id'),
            'channels' => $channels,
        ]);
    }
}

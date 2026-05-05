<?php

namespace App\Jobs;

use App\Models\Channel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class PersistMainSystemChannelsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 120;

    public int $tries = 3;

    /**
     * @param  list<array<string, mixed>>  $channels
     */
    public function __construct(
        public int $mainTeamId,
        public array $channels,
    ) {}

    public function handle(): void
    {
        $now = now();

        $channels = collect($this->channels)
            ->map(fn (array $channel) => [
                'code' => $channel['code'],
                'name' => $channel['name'],
                'is_active' => (bool) ($channel['is_active'] ?? true),
                'main_team_id' => $this->mainTeamId,
                'deleted_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ])
            ->values()
            ->all();

        if ($channels === []) {
            return;
        }

        Channel::query()->upsert(
            $channels,
            ['code'],
            ['name', 'is_active', 'main_team_id', 'deleted_at', 'updated_at'],
        );
    }

    public function failed(Throwable $exception): void
    {
        Log::channel('sync_reports')->error('[MainSystemSync] Failed to persist channels', [
            'error' => $exception->getMessage(),
            'main_team_id' => $this->mainTeamId,
        ]);
    }
}

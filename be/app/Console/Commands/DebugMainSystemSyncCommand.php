<?php

namespace App\Console\Commands;

use App\Actions\MainSystem\SendMainSystemChannelsAction;
use App\Services\MainSystem\MainSystemHttpClient;
use Illuminate\Console\Command;
use Throwable;

class DebugMainSystemSyncCommand extends Command
{
    protected $signature = 'main-system:debug {--send-channels : Send the current channel list to the configured Main System}';

    protected $description = 'Inspect Main System sync configuration and optionally send a channel payload.';

    public function handle(MainSystemHttpClient $client, SendMainSystemChannelsAction $sendChannelsAction): int
    {
        $token = (string) config('main_system.token');
        $blockers = $client->pushBlockers();

        $this->line('Main System sync config');
        $this->table(['Key', 'Value'], [
            ['MAIN_SYSTEM_IS_MAIN', config('main_system.is_main') ? 'true' : 'false'],
            ['MAIN_SYSTEM_API_URL', config('main_system.api_url') ?: '(empty)'],
            ['MAIN_SYSTEM_MAIN_TEAM_ID', config('main_system.main_team_id') ?: '(empty)'],
            ['MAIN_SYSTEM_TOKEN', $token !== '' ? 'set ('.substr($token, 0, 4).'...'.substr($token, -4).')' : '(empty)'],
            ['QUEUE_MAIN_SYSTEM_SYNC', config('queue.queues.main-system-sync')],
            ['Insight URL', config('main_system.api_url') ? $client->urlFor('api/main-system/insight-reports') : '(empty api url)'],
            ['Channel URL', config('main_system.api_url') ? $client->urlFor('api/main-system/channels') : '(empty api url)'],
        ]);

        if ($blockers !== []) {
            $this->warn('Push is disabled:');
            foreach ($blockers as $blocker) {
                $this->line('- '.$blocker);
            }
        } else {
            $this->info('Push is enabled.');
        }

        if (! $this->option('send-channels')) {
            $this->line('Run with --send-channels to perform a real HTTP send test.');

            return Command::SUCCESS;
        }

        if ($blockers !== []) {
            $this->error('Cannot send channels while push is disabled.');

            return Command::FAILURE;
        }

        try {
            $sendChannelsAction->execute();
            $this->info('Channel send action executed. Check storage/logs/sync_reports-*.log on both systems.');

            return Command::SUCCESS;
        } catch (Throwable $exception) {
            $this->error('Channel send failed: '.$exception->getMessage());

            return Command::FAILURE;
        }
    }
}

<?php

namespace App\Console\Commands;

use App\Services\Campaign\DetectTrashCampaignService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class DetectTrashCampaignsCommand extends Command
{
    protected $signature = 'campaigns:detect-trash
        {date? : Y-m-d formatted date (defaults to today)}
        {--all : Check across all dates instead of a specific date}';

    protected $description = 'Detect campaigns with spend but no realtime tracking data and send a Telegram alert';

    public function handle(DetectTrashCampaignService $service): int
    {
        try {
            if ($this->option('all')) {
                $this->line('Detecting trash campaigns across all dates...');
                $service->detect();
            } else {
                $date = $this->argument('date')
                    ? Carbon::parse($this->argument('date'))->toDateString()
                    : Carbon::now()->toDateString();

                $this->line("Detecting trash campaigns for date: {$date}");
                $service->detect($date);
            }

            $this->info('Done.');

            return Command::SUCCESS;
        } catch (Throwable $e) {
            Log::channel('sync_reports')->error('Error detecting trash campaigns', [
                'error' => $e->getMessage(),
                'stack_trace' => $e->getTraceAsString(),
            ]);

            $this->error($e->getMessage());

            return Command::FAILURE;
        }
    }
}

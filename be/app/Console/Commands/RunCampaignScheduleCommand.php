<?php

namespace App\Console\Commands;

use App\Models\Campaign;
use App\Models\CampaignReport;
use App\Models\CampaignSchedule;
use App\Services\Integrations\Ads\AdsStatusService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class RunCampaignScheduleCommand extends Command
{
    protected $signature = 'campaigns:run-schedules';

    protected $description = 'Automatically toggle campaigns based on schedules';

    public function handle(AdsStatusService $adsStatusService): int
    {
        $currentTime = now()->format('H:i');

        $schedules = CampaignSchedule::query()
            ->where('is_active', true)
            ->where(function ($query) use ($currentTime) {
                $query->whereTime('turn_on_time', $currentTime)
                    ->orWhereTime('turn_off_time', $currentTime);
            })
            ->with(['items'])
            ->get();

        if ($schedules->isEmpty()) {
            return Command::SUCCESS;
        }

        foreach ($schedules as $schedule) {
            $turnOnTime = $schedule->turn_on_time ? Carbon::parse($schedule->turn_on_time)->format('H:i') : null;
            $turnOffTime = $schedule->turn_off_time ? Carbon::parse($schedule->turn_off_time)->format('H:i') : null;

            $action = null;
            if ($turnOnTime === $currentTime) {
                $action = 'ACTIVE';
            } elseif ($turnOffTime === $currentTime) {
                $action = 'PAUSED';
            }

            if (! $action) {
                continue;
            }

            $campaignIds = $schedule->items->pluck('campaign_id')->unique();
            if ($campaignIds->isEmpty()) {
                continue;
            }

            foreach ($campaignIds as $campaignId) {
                $this->processCampaign($campaignId, $action, $adsStatusService);
            }
        }

        return Command::SUCCESS;
    }

    protected function processCampaign(string $campaignId, string $targetStatus, AdsStatusService $adsStatusService): void
    {
        try {
            $campaign = Campaign::where('campaign_id', $campaignId)->first();

            if ($campaign && $campaign->status === $targetStatus) {
                return;
            }

            $success = $adsStatusService->updateCampaignStatus($campaignId, $targetStatus, true);

            if ($success) {
                if ($campaign) {
                    $campaign->update(['status' => $targetStatus]);
                }

                CampaignReport::where('campaign_id', $campaignId)
                    ->where('date_start', now()->toDateString())
                    ->update(['campaign_status' => $targetStatus]);
            }

            Log::channel('sync_reports')->info("CampaignScheduler: Updated campaign {$campaignId} to {$targetStatus}");
        } catch (Throwable $e) {
            Log::channel('sync_reports')->error("CampaignScheduler: Exception for campaign {$campaignId}", ['exception' => $e]);
        }
    }
}

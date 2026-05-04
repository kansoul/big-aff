<?php

namespace App\Actions\CampaignSchedule;

use App\Models\CampaignSchedule;
use App\Models\CampaignScheduleItem;
use App\Support\OwnerResource\CampaignScheduleOwnerResource;
use Illuminate\Support\Facades\DB;

class UpdateCampaignScheduleAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(CampaignSchedule $schedule, array $data): CampaignSchedule
    {
        (new CampaignScheduleOwnerResource)->authorize($schedule);

        return DB::transaction(function () use ($schedule, $data) {
            $syncItems = array_key_exists('campaign_ids', $data);
            $campaignIds = $data['campaign_ids'] ?? [];
            unset($data['campaign_ids']);

            $schedule->update($data);

            // Only sync items when campaign_ids is explicitly provided in the payload
            if ($syncItems) {
                $schedule->items()->delete();
                if (! empty($campaignIds)) {
                    $items = array_map(fn ($id) => new CampaignScheduleItem(['campaign_id' => $id]), $campaignIds);
                    $schedule->items()->saveMany($items);
                }
            }

            return $schedule->load(['creator', 'items']);
        });
    }
}

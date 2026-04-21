<?php

namespace App\Actions\CampaignSchedule;

use App\Models\CampaignSchedule;
use App\Models\CampaignScheduleItem;
use Illuminate\Support\Facades\DB;

class CreateCampaignScheduleAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(array $data): CampaignSchedule
    {
        return DB::transaction(function () use ($data) {
            $campaignIds = $data['campaign_ids'] ?? [];
            unset($data['campaign_ids']);

            /** @var CampaignSchedule $schedule */
            $schedule = CampaignSchedule::create($data);

            if (! empty($campaignIds)) {
                $items = array_map(fn ($id) => new CampaignScheduleItem(['campaign_id' => $id]), $campaignIds);
                $schedule->items()->saveMany($items);
            }

            return $schedule->load(['creator', 'items']);
        });
    }
}

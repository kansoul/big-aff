<?php

namespace App\Actions\CampaignSchedule;

use App\Models\CampaignSchedule;
use App\Support\OwnerResource\CampaignScheduleOwnerResource;

class DeleteCampaignScheduleAction
{
    public function execute(CampaignSchedule $schedule): void
    {
        (new CampaignScheduleOwnerResource)->authorize($schedule);

        $schedule->delete();
    }
}

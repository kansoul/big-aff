<?php

namespace App\Actions\CampaignSchedule;

use App\Models\CampaignSchedule;
use App\Support\OwnershipFilter\OwnershipFilter;

class DeleteCampaignScheduleAction
{
    public function execute(CampaignSchedule $schedule): void
    {
        OwnershipFilter::forAuthUser()->authorize($schedule->created_by);

        $schedule->delete();
    }
}

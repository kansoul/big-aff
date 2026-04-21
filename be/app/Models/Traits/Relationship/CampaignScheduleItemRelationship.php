<?php

namespace App\Models\Traits\Relationship;

use App\Models\CampaignSchedule;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait CampaignScheduleItemRelationship
{
    public function schedule(): BelongsTo
    {
        return $this->belongsTo(CampaignSchedule::class, 'campaign_schedule_id');
    }
}

<?php

namespace App\Models\Traits\Relationship;

use App\Models\Campaign;

trait InsightReportRelationship
{
    public function campaign()
    {
        return $this->belongsTo(Campaign::class, 'campaign_id', 'campaign_id');
    }
}

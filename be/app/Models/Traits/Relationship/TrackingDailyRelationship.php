<?php

namespace App\Models\Traits\Relationship;

use App\Models\LinkData;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait TrackingDailyRelationship
{
    /**
     * @return BelongsTo<LinkData, $this>
     */
    public function linkData(): BelongsTo
    {
        return $this->belongsTo(LinkData::class, 'link_data_id');
    }
}

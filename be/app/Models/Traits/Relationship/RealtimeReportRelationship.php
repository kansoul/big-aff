<?php

namespace App\Models\Traits\Relationship;

use App\Models\Campaign;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait RealtimeReportRelationship
{
    /**
     * @return BelongsTo<Campaign, $this>
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'campaign_id', 'campaign_id');
    }
}

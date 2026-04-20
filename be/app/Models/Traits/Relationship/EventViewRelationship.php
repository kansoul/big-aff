<?php

namespace App\Models\Traits\Relationship;

use App\Models\LinkData;
use App\Models\TrackingSession;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait EventViewRelationship
{
    /**
     * @return BelongsTo<TrackingSession, $this>
     */
    public function trackingSession(): BelongsTo
    {
        return $this->belongsTo(TrackingSession::class, 'session_id', 'session_id');
    }

    /**
     * @return BelongsTo<LinkData, $this>
     */
    public function linkData(): BelongsTo
    {
        return $this->belongsTo(LinkData::class, 'link_data_id');
    }
}

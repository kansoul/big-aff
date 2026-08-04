<?php

namespace App\Models\Traits\Relationship;

use App\Models\Campaign;
use App\Models\TrackingSession;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait EventAdLoadRelationship
{
    /**
     * @return BelongsTo<TrackingSession, $this>
     */
    public function trackingSession(): BelongsTo
    {
        return $this->belongsTo(TrackingSession::class, 'session_id', 'session_id');
    }

    /**
     * @return BelongsTo<Campaign, $this>
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'campaign_id', 'campaign_id');
    }
}

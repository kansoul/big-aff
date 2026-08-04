<?php

namespace App\Models\Traits\Relationship;

use App\Models\EventAdLoad;
use App\Models\EventClick;
use App\Models\EventView;
use App\Models\RevenueReport;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait TrackingSessionRelationship
{
    /**
     * @return HasMany<EventView, $this>
     */
    public function eventViews(): HasMany
    {
        return $this->hasMany(EventView::class, 'session_id', 'session_id');
    }

    /**
     * @return HasMany<EventClick, $this>
     */
    public function eventClicks(): HasMany
    {
        return $this->hasMany(EventClick::class, 'session_id', 'session_id');
    }

    /**
     * @return HasMany<EventAdLoad, $this>
     */
    public function eventAdLoads(): HasMany
    {
        return $this->hasMany(EventAdLoad::class, 'session_id', 'session_id');
    }

    public function revenueReports(): HasMany
    {
        return $this->hasMany(RevenueReport::class, 'session_id', 'session_id');
    }
}

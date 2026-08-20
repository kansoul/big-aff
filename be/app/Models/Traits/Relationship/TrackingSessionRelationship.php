<?php

namespace App\Models\Traits\Relationship;

use App\Models\AdsConversion;
use App\Models\EventAdLoad;
use App\Models\EventClick;
use App\Models\EventView;
use App\Models\Lead;
use App\Models\RevenueReport;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

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

    public function revenueReport(): HasOne
    {
        return $this->hasOne(RevenueReport::class, 'session_id', 'session_id');
    }

    public function adsConversions(): HasMany
    {
        return $this->hasMany(AdsConversion::class, 'session_id', 'session_id');
    }

    public function lead(): HasOne
    {
        return $this->hasOne(Lead::class, 'session_id', 'session_id');
    }
}

<?php

namespace App\Models\Traits\Relationship;

use App\Models\AdsLink;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait PixelRelationship
{
    /** @return HasMany<AdsLink, $this> */
    public function adsLinks(): HasMany
    {
        return $this->hasMany(AdsLink::class);
    }
}

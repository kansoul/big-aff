<?php

namespace App\Models\Traits\Relationship;

use App\Models\AdsLink;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait PixelConversionRelationship
{
    /**
     * @return BelongsTo<AdsLink, $this>
     */
    public function adsLink(): BelongsTo
    {
        return $this->belongsTo(AdsLink::class);
    }
}

<?php

namespace App\Models\Traits\Relationship;

use App\Models\BusinessCenter;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait PixelRelationship
{
    /** @return BelongsTo<BusinessCenter, $this> */
    public function businessCenter(): BelongsTo
    {
        return $this->belongsTo(BusinessCenter::class);
    }
}

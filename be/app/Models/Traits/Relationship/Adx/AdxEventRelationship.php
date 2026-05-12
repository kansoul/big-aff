<?php

namespace App\Models\Traits\Relationship\Adx;

use App\Models\AdxLinkData;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait AdxEventRelationship
{
    /**
     * @return BelongsTo<AdxLinkData, $this>
     */
    public function linkData(): BelongsTo
    {
        return $this->belongsTo(AdxLinkData::class, 'adx_link_data_id');
    }
}

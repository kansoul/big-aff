<?php

namespace App\Models\Traits\Relationship\Adx;

use App\Models\AdxConversionUpload;
use App\Models\AdxLinkData;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait AdxConversionRelationship
{
    /**
     * @return BelongsTo<AdxLinkData, $this>
     */
    public function linkData(): BelongsTo
    {
        return $this->belongsTo(AdxLinkData::class, 'adx_link_data_id');
    }

    /**
     * @return HasMany<AdxConversionUpload>
     */
    public function uploads(): HasMany
    {
        return $this->hasMany(AdxConversionUpload::class);
    }
}

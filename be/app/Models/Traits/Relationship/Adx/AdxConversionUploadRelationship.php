<?php

namespace App\Models\Traits\Relationship\Adx;

use App\Models\AdxConversion;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait AdxConversionUploadRelationship
{
    /**
     * @return BelongsTo<AdxConversion, $this>
     */
    public function conversion(): BelongsTo
    {
        return $this->belongsTo(AdxConversion::class, 'adx_conversion_id');
    }
}

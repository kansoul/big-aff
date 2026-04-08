<?php

namespace App\Models\Traits\Relationship;

use App\Models\File;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait CategoryRelationship
{
    /**
     * @return BelongsTo<File, $this>
     */
    public function featureMedia(): BelongsTo
    {
        return $this->belongsTo(File::class, 'feature_media_id');
    }
}

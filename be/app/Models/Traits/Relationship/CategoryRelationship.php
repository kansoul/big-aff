<?php

namespace App\Models\Traits\Relationship;

use App\Models\Category;
use App\Models\File;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait CategoryRelationship
{
    /**
     * @return BelongsTo<Category, $this>
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    /**
     * @return HasMany<Category, $this>
     */
    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    /**
     * @return BelongsTo<File, $this>
     */
    public function featureMedia(): BelongsTo
    {
        return $this->belongsTo(File::class, 'feature_media_id');
    }
}

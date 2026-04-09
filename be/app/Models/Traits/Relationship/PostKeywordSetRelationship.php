<?php

namespace App\Models\Traits\Relationship;

use App\Models\KeywordSet;
use App\Models\Post;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait PostKeywordSetRelationship
{
    /**
     * @return BelongsTo<Post, $this>
     */
    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    /**
     * @return BelongsTo<KeywordSet, $this>
     */
    public function keywordSet(): BelongsTo
    {
        return $this->belongsTo(KeywordSet::class);
    }
}

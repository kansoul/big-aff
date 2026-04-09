<?php

namespace App\Models\Traits\Relationship;

use App\Models\Post;
use App\Models\PostKeywordSet;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

trait KeywordSetRelationship
{
    /**
     * @return BelongsToMany<Post, $this>
     */
    public function posts(): BelongsToMany
    {
        return $this->belongsToMany(Post::class, 'post_keyword_sets')->using(PostKeywordSet::class);
    }
}

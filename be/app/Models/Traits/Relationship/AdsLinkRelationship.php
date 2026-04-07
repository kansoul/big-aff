<?php

namespace App\Models\Traits\Relationship;

use App\Models\Post;
use App\Models\PostKeywordSet;
use App\Models\Site;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait AdsLinkRelationship
{
    /**
     * @return BelongsTo<Site, $this>
     */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    /**
     * @return BelongsTo<Post, $this>
     */
    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    /**
     * @return BelongsTo<PostKeywordSet, $this>
     */
    public function keywordSet(): BelongsTo
    {
        return $this->belongsTo(PostKeywordSet::class, 'keyword_set_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}

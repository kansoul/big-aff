<?php

namespace App\Models\Traits\Relationship;

use App\Models\Category;
use App\Models\File;
use App\Models\KeywordSet;
use App\Models\PostKeywordSet;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

trait PostRelationship
{
    /**
     * @return BelongsTo<Category, $this>
     */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /**
     * @return BelongsTo<File, $this>
     */
    public function featureMedia(): BelongsTo
    {
        return $this->belongsTo(File::class, 'feature_media_id');
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

    /**
     * @return BelongsToMany<KeywordSet, $this>
     */
    public function keywordSets(): BelongsToMany
    {
        return $this->belongsToMany(KeywordSet::class, 'post_keyword_sets')->using(PostKeywordSet::class);
    }

    /**
     * Users assigned to this post (view-only access).
     *
     * @return BelongsToMany<User, $this>
     */
    public function assignedUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'post_user')->withTimestamps();
    }
}

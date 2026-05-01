<?php

namespace App\Models\Traits\Relationship;

use App\Models\Channel;
use App\Models\KeywordSet;
use App\Models\LinkData;
use App\Models\Post;
use App\Models\Site;
use App\Models\Style;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
     * @return BelongsTo<KeywordSet, $this>
     */
    public function keywordSet(): BelongsTo
    {
        return $this->belongsTo(KeywordSet::class, 'keyword_set_id');
    }

    /**
     * @return BelongsTo<Channel, $this>
     */
    public function channel(): BelongsTo
    {
        return $this->belongsTo(Channel::class, 'channel_code', 'code');
    }

    /**
     * @return BelongsTo<Style, $this>
     */
    public function style(): BelongsTo
    {
        return $this->belongsTo(Style::class, 'style_code', 'code');
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
     * @return HasMany<LinkData>
     */
    public function linkDatas(): HasMany
    {
        return $this->hasMany(LinkData::class, 'ads_link_id', 'id');
    }
}

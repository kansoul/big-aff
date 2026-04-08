<?php

namespace App\Models\Traits\Relationship;

use App\Models\AdsLink;
use App\Models\Post;
use App\Models\Site;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait FollowRelationship
{
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    public function adsLink(): BelongsTo
    {
        return $this->belongsTo(AdsLink::class);
    }
}

<?php

namespace App\Models\Traits\Relationship;

use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

trait ChannelRelationship
{
    /**
     * Users assigned to this channel.
     *
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'channel_user')
            ->withTimestamps()
            ->withPivot('deleted_at');
    }
}

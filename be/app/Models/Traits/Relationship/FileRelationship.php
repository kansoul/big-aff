<?php

namespace App\Models\Traits\Relationship;

use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait FileRelationship
{
    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Users using this file as avatar.
     *
     * @return HasMany<User, $this>
     */
    public function avatarUsers(): HasMany
    {
        return $this->hasMany(User::class, 'avatar_id');
    }
}

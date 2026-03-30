<?php

namespace App\Models\Traits\Relationship;

use App\Models\Role;
use App\Models\User;
use App\Models\UserParentChild;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * UserRelationship trait
 */
trait UserRelationship
{
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(User::class, 'parent_id');
    }

    /** Rows in `user_parent_child` where this user is the parent. */
    public function assignedChildrenLinks(): HasMany
    {
        return $this->hasMany(UserParentChild::class, 'parent_user_id');
    }

    /** At most one row where this user is the child in `user_parent_child`. */
    public function assignedParentLink(): HasOne
    {
        return $this->hasOne(UserParentChild::class, 'child_user_id');
    }
}

<?php

namespace App\Models\Traits\Relationship;

use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait UserParentChildRelationship
{
    /**
     * @return BelongsTo<User, UserParentChild>
     */
    public function parentUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_user_id');
    }

    /**
     * @return BelongsTo<User, UserParentChild>
     */
    public function childUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'child_user_id');
    }
}

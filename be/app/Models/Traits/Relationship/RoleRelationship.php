<?php

namespace App\Models\Traits\Relationship;

use App\Models\User;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * RoleRelationship trait
 */
trait RoleRelationship
{
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}

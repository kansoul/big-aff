<?php

namespace App\Models\Traits\Relationship;

use App\Models\RolePermission;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * RoleRelationship trait
 */
trait RoleRelationship
{
    /**
     * @return HasMany<RolePermission, $this>
     */
    public function rolePermissions(): HasMany
    {
        return $this->hasMany(RolePermission::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}

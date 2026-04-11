<?php

namespace App\Models\Traits\Relationship;

use App\Models\TeamUser;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait TeamRelationship
{
    /**
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'team_user')
            ->withPivot(['joined_at', 'team_role'])
            ->withTimestamps();
    }

    /**
     * @return HasMany<TeamUser>
     */
    public function teamUsers(): HasMany
    {
        return $this->hasMany(TeamUser::class);
    }
}

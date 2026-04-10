<?php

namespace App\Models\Traits\Relationship;

use App\Models\BusinessCenter;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

trait AccountRelationship
{
    /**
     * @return BelongsTo<BusinessCenter, $this>
     */
    public function businessCenter(): BelongsTo
    {
        return $this->belongsTo(BusinessCenter::class);
    }

    /**
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }
}

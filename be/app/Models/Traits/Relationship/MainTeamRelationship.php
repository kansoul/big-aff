<?php

namespace App\Models\Traits\Relationship;

use App\Models\Account;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait MainTeamRelationship
{
    /**
     * @return HasMany<Account>
     */
    public function accounts(): HasMany
    {
        return $this->hasMany(Account::class);
    }
}

<?php

namespace App\Models\Traits\Relationship;

use App\Models\Account;
use App\Models\Channel;
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

    /**
     * @return HasMany<Channel>
     */
    public function channels(): HasMany
    {
        return $this->hasMany(Channel::class);
    }
}

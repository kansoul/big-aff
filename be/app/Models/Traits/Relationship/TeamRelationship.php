<?php

namespace App\Models\Traits\Relationship;

use App\Models\Account;
use App\Models\BusinessCenter;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait TeamRelationship
{
    /**
     * @return HasMany<Account, $this>
     */
    public function accounts(): HasMany
    {
        return $this->hasMany(Account::class);
    }

    /**
     * @return HasMany<BusinessCenter, $this>
     */
    public function businessCenters(): HasMany
    {
        return $this->hasMany(BusinessCenter::class);
    }
}

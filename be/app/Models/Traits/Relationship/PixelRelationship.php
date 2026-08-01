<?php

namespace App\Models\Traits\Relationship;

use App\Models\Account;
use App\Models\AdsLink;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait PixelRelationship
{
    /** @return BelongsTo<Account, $this> */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /** @return HasMany<AdsLink, $this> */
    public function adsLinks(): HasMany
    {
        return $this->hasMany(AdsLink::class);
    }
}

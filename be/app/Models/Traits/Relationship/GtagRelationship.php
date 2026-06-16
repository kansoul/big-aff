<?php

namespace App\Models\Traits\Relationship;

use App\Models\Account;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait GtagRelationship
{
    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}

<?php

namespace App\Models\Traits\Relationship;

use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait UserTablePreferenceRelationship
{
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

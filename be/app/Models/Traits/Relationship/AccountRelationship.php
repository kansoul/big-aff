<?php

namespace App\Models\Traits\Relationship;

use App\Models\BusinessCenter;
use App\Models\Campaign;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait AccountRelationship
{
    /**
     * @return HasMany<Campaign>
     */
    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class, 'account_id', 'account_id');
    }

    /**
     * @return BelongsTo<BusinessCenter, int>
     */
    public function businessCenter(): BelongsTo
    {
        return $this->belongsTo(BusinessCenter::class);
    }

    /**
     * @return BelongsTo<User, int>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<User, int>
     */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}

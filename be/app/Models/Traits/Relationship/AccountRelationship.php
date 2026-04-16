<?php

namespace App\Models\Traits\Relationship;

use App\Models\BusinessCenter;
use App\Models\Campaign;
use App\Models\Conversion;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

trait AccountRelationship
{
    /**
     * @return BelongsTo<BusinessCenter, $this>
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

    /**
     * @return HasOne<Conversion>
     */
    public function conversion(): HasOne
    {
        return $this->hasOne(Conversion::class, 'account_id', 'account_id');
    }
}

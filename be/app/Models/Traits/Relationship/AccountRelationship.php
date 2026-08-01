<?php

namespace App\Models\Traits\Relationship;

use App\Models\BusinessCenter;
use App\Models\Campaign;
use App\Models\Conversion;
use App\Models\Gtag;
use App\Models\MainTeam;
use App\Models\Pixel;
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
     * @return BelongsTo<MainTeam, $this>
     */
    public function mainTeam(): BelongsTo
    {
        return $this->belongsTo(MainTeam::class);
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

    /**
     * @return HasOne<Gtag>
     */
    public function gtag(): HasOne
    {
        return $this->hasOne(Gtag::class, 'account_id', 'account_id');
    }

    /** @return HasMany<Pixel, $this> */
    public function pixels(): HasMany
    {
        return $this->hasMany(Pixel::class);
    }
}

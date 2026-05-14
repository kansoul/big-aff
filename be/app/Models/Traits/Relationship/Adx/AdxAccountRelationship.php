<?php

namespace App\Models\Traits\Relationship\Adx;

use App\Models\AdxCampaign;
use App\Models\BusinessCenter;
use App\Models\MainTeam;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait AdxAccountRelationship
{
    /**
     * @return HasMany<AdxCampaign>
     */
    public function campaigns(): HasMany
    {
        return $this->hasMany(AdxCampaign::class, 'adx_account_id', 'account_id');
    }

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
        return $this->belongsToMany(User::class, 'adx_account_user')
            ->withTimestamps();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}

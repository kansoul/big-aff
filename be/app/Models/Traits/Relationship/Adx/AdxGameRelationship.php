<?php

namespace App\Models\Traits\Relationship\Adx;

use App\Models\AdxCampaignReport;
use App\Models\AdxLink;
use App\Models\AdxLinkData;
use App\Models\AdxRevenueReport;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait AdxGameRelationship
{
    /**
     * @return HasMany<AdxLink>
     */
    public function links(): HasMany
    {
        return $this->hasMany(AdxLink::class);
    }

    /**
     * @return HasMany<AdxLinkData>
     */
    public function linkDatas(): HasMany
    {
        return $this->hasMany(AdxLinkData::class);
    }

    /**
     * @return HasMany<AdxRevenueReport>
     */
    public function revenueReports(): HasMany
    {
        return $this->hasMany(AdxRevenueReport::class);
    }

    /**
     * @return HasMany<AdxCampaignReport>
     */
    public function campaignReports(): HasMany
    {
        return $this->hasMany(AdxCampaignReport::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}

<?php

namespace App\Models\Traits\Relationship\Adx;

use App\Models\AdxAccount;
use App\Models\AdxCampaignReport;
use App\Models\AdxLinkData;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait AdxCampaignRelationship
{
    /**
     * @return BelongsTo<AdxAccount, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(AdxAccount::class, 'adx_account_id');
    }

    /**
     * @return HasMany<AdxLinkData>
     */
    public function linkDatas(): HasMany
    {
        return $this->hasMany(AdxLinkData::class, 'campaign_id', 'campaign_id');
    }

    /**
     * @return HasMany<AdxCampaignReport>
     */
    public function reports(): HasMany
    {
        return $this->hasMany(AdxCampaignReport::class, 'adx_campaign_id');
    }
}

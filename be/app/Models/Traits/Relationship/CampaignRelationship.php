<?php

namespace App\Models\Traits\Relationship;

use App\Models\Account;
use App\Models\AdsetInsightsReport;
use App\Models\AdsInsightsReport;
use App\Models\CampaignApplyRule;
use App\Models\CampaignRule;
use App\Models\LinkData;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

trait CampaignRelationship
{
    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'account_id', 'account_id');
    }

    /**
     * @return HasOne<LinkData, $this>
     */
    public function linkData(): HasOne
    {
        return $this->hasOne(LinkData::class, 'campaign_id', 'campaign_id');
    }

    /**
     * @return HasMany<AdsetInsightsReport, $this>
     */
    public function adsetInsightsReports(): HasMany
    {
        return $this->hasMany(AdsetInsightsReport::class, 'campaign_id', 'campaign_id');
    }

    /**
     * @return HasMany<AdsInsightsReport, $this>
     */
    public function adsInsightsReports(): HasMany
    {
        return $this->hasMany(AdsInsightsReport::class, 'campaign_id', 'campaign_id');
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

    /**
     * @return MorphMany<CampaignApplyRule, $this>
     */
    public function applyRules(): MorphMany
    {
        return $this->morphMany(
            CampaignApplyRule::class,
            'sourceable',
            'sourceable_type',
            'sourceable_id',
            'campaign_id'
        );
    }

    /**
     * @return MorphToMany<CampaignRule, $this>
     */
    public function campaignRules(): MorphToMany
    {
        return $this->morphToMany(CampaignRule::class, 'sourceable', 'campaign_apply_rules', parentKey: 'campaign_id');
    }
}

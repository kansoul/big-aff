<?php

namespace App\Models\Traits\Relationship;

use App\Models\CampaignApplyRule;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait CampaignRuleRelationship
{
    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<CampaignApplyRule, $this>
     */
    public function applyRules(): HasMany
    {
        return $this->hasMany(CampaignApplyRule::class);
    }
}

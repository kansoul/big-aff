<?php

namespace App\Models\Traits\Relationship;

use App\Models\CampaignRule;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

trait CampaignApplyRuleRelationship
{
    /**
     * @return BelongsTo<CampaignRule, $this>
     */
    public function campaignRule(): BelongsTo
    {
        return $this->belongsTo(CampaignRule::class);
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function sourceable(): MorphTo
    {
        return $this->morphTo();
    }
}

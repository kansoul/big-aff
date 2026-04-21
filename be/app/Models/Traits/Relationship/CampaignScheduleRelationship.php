<?php

namespace App\Models\Traits\Relationship;

use App\Models\CampaignScheduleItem;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait CampaignScheduleRelationship
{
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(CampaignScheduleItem::class);
    }
}

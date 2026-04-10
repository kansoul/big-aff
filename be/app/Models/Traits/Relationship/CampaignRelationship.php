<?php

namespace App\Models\Traits\Relationship;

use App\Models\Account;
use App\Models\LinkData;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

trait CampaignRelationship
{
    /**
     * @return BelongsTo<Account, string>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'account_id', 'account_id');
    }

    /**
     * @return HasOne<LinkData>
     */
    public function linkData(): HasOne
    {
        return $this->hasOne(LinkData::class, 'campaign_id', 'campaign_id');
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

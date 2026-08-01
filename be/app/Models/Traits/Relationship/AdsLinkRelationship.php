<?php

namespace App\Models\Traits\Relationship;

use App\Models\Account;
use App\Models\LinkData;
use App\Models\Pixel;
use App\Models\Site;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait AdsLinkRelationship
{
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function pixel(): BelongsTo
    {
        return $this->belongsTo(Pixel::class);
    }

    /**
     * @return BelongsTo<Site, $this>
     */
    public function site(): BelongsTo
    {
        return $this->belongsTo(Site::class);
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

    /**
     * @return HasMany<LinkData>
     */
    public function linkDatas(): HasMany
    {
        return $this->hasMany(LinkData::class, 'ads_link_id', 'id');
    }
}

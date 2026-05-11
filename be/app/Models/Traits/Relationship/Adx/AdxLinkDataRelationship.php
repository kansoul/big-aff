<?php

namespace App\Models\Traits\Relationship\Adx;

use App\Models\AdxCampaignReport;
use App\Models\AdxConversion;
use App\Models\AdxEventClick;
use App\Models\AdxEventView;
use App\Models\AdxGame;
use App\Models\AdxLink;
use App\Models\AdxRealtimeReport;
use App\Models\AdxRevenueReport;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait AdxLinkDataRelationship
{
    /**
     * @return BelongsTo<AdxLink, $this>
     */
    public function link(): BelongsTo
    {
        return $this->belongsTo(AdxLink::class, 'adx_link_id');
    }

    /**
     * @return BelongsTo<AdxGame, $this>
     */
    public function game(): BelongsTo
    {
        return $this->belongsTo(AdxGame::class, 'adx_game_id');
    }

    /**
     * @return HasMany<AdxConversion>
     */
    public function conversions(): HasMany
    {
        return $this->hasMany(AdxConversion::class);
    }

    /**
     * @return HasMany<AdxEventView>
     */
    public function eventViews(): HasMany
    {
        return $this->hasMany(AdxEventView::class);
    }

    /**
     * @return HasMany<AdxEventClick>
     */
    public function eventClicks(): HasMany
    {
        return $this->hasMany(AdxEventClick::class);
    }

    /**
     * @return HasMany<AdxRealtimeReport>
     */
    public function realtimeReports(): HasMany
    {
        return $this->hasMany(AdxRealtimeReport::class);
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
}

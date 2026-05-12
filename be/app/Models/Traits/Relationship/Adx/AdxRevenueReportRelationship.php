<?php

namespace App\Models\Traits\Relationship\Adx;

use App\Models\AdxGame;
use App\Models\AdxLink;
use App\Models\AdxLinkData;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait AdxRevenueReportRelationship
{
    /**
     * @return BelongsTo<AdxLinkData, $this>
     */
    public function linkData(): BelongsTo
    {
        return $this->belongsTo(AdxLinkData::class, 'adx_link_data_id');
    }

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
}

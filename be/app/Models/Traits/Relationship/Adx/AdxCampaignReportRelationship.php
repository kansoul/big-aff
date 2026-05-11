<?php

namespace App\Models\Traits\Relationship\Adx;

use App\Models\AdxAccount;
use App\Models\AdxCampaign;
use App\Models\AdxGame;
use App\Models\AdxLink;
use App\Models\AdxLinkData;
use App\Models\AdxRealtimeReport;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait AdxCampaignReportRelationship
{
    /**
     * @return BelongsTo<AdxAccount, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(AdxAccount::class, 'adx_account_id');
    }

    /**
     * @return BelongsTo<AdxCampaign, $this>
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(AdxCampaign::class, 'adx_campaign_id');
    }

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

    /**
     * @return BelongsTo<AdxRealtimeReport, $this>
     */
    public function realtimeReport(): BelongsTo
    {
        return $this->belongsTo(AdxRealtimeReport::class, 'adx_realtime_report_id');
    }
}

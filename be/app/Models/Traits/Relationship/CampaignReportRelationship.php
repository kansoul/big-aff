<?php

namespace App\Models\Traits\Relationship;

use App\Models\Campaign;
use App\Models\RealtimeReport;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait CampaignReportRelationship
{
    /**
     * @return BelongsTo<RealtimeReport, $this>
     */
    public function realtimeReport(): BelongsTo
    {
        return $this->belongsTo(RealtimeReport::class, 'realtime_report_id');
    }

    /**
     * @return BelongsTo<Campaign, $this>
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'campaign_id', 'campaign_id');
    }
}

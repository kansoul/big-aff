<?php

namespace App\Models\Traits\Relationship;

use App\Models\Campaign;
use App\Models\MainTeam;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait InsightReportRelationship
{
    public function campaign()
    {
        return $this->belongsTo(Campaign::class, 'campaign_id', 'campaign_id');
    }

    /**
     * User that owned the account when this spend was recorded.
     *
     * @return BelongsTo<User, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    /**
     * Main team that owned the account when this spend was recorded.
     *
     * @return BelongsTo<MainTeam, $this>
     */
    public function ownerMainTeam(): BelongsTo
    {
        return $this->belongsTo(MainTeam::class, 'owner_main_team_id');
    }
}

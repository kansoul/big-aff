<?php

namespace App\Models;

use App\Models\Traits\Relationship\CampaignScheduleItemRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CampaignScheduleItem extends Model
{
    use CampaignScheduleItemRelationship, HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'campaign_schedule_id',
        'campaign_id',
    ];
}

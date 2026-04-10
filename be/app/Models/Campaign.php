<?php

namespace App\Models;

use App\Models\Traits\Relationship\CampaignRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Campaign extends Model
{
    use CampaignRelationship, HasFactory, SoftDeletes;

    protected $fillable = [
        'account_id',
        'ads_type',
        'campaign_id',
        'campaign_name',
        'daily_budget',
        'lifetime_budget',
        'status',
        'start_time',
        'stop_time',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'stop_time' => 'datetime',
        'daily_budget' => 'decimal:2',
        'lifetime_budget' => 'decimal:2',
    ];
}

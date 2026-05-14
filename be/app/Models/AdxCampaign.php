<?php

namespace App\Models;

use App\Models\Traits\Relationship\Adx\AdxCampaignRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdxCampaign extends Model
{
    use AdxCampaignRelationship, HasFactory;

    protected $fillable = [
        'adx_account_id',
        'source',
        'campaign_id',
        'campaign_name',
        'daily_budget',
        'lifetime_budget',
        'gam_custom_key',
        'gam_custom_key_id',
        'gam_custom_value',
        'gam_custom_value_id',
        'status',
        'start_time',
        'stop_time',
        'created_time',
        'updated_time',
        'first_seen_at',
        'last_seen_at',
    ];

    protected function casts(): array
    {
        return [
            'daily_budget' => 'decimal:4',
            'lifetime_budget' => 'decimal:4',
            'gam_custom_key_id' => 'integer',
            'gam_custom_value_id' => 'integer',
            'start_time' => 'datetime',
            'stop_time' => 'datetime',
            'created_time' => 'datetime',
            'updated_time' => 'datetime',
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }
}

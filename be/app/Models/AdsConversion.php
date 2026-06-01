<?php

namespace App\Models;

use App\Models\Traits\Relationship\AdsConversionRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdsConversion extends Model
{
    use AdsConversionRelationship, HasFactory;

    protected $fillable = [
        'account_id',
        'campaign_id',
        'gclid',
        'wbraid',
        'gbraid',
        'session_id',
        'conversion_action_resource_name',
        'conversion_value',
        'currency_code',
        'ip_address',
        'user_agent',
        'conversion_date_time',
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'conversion_value' => 'decimal:6',
            'synced_at' => 'datetime',
        ];
    }
}

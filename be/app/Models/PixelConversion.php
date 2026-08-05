<?php

namespace App\Models;

use App\Models\Traits\Relationship\PixelConversionRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PixelConversion extends Model
{
    use HasFactory, PixelConversionRelationship;

    protected $fillable = [
        'ads_link_id',
        'tracking_code',
        'platform',
        'advertiser_id',
        'pixel_id',
        'event_name',
        'event_id',
        'session_id',
        'campaign_id',
        'adset_id',
        'ad_id',
        'click_id',
        'conversion_value',
        'currency_code',
        'ip_address',
        'user_agent',
        'payload',
        'conversion_date_time',
        'postback_url',
        'postback_attempts',
        'postback_status',
        'postback_response',
        'postback_sent_at',
    ];

    protected function casts(): array
    {
        return [
            'conversion_value' => 'decimal:6',
            'payload' => 'array',
            'conversion_date_time' => 'datetime',
            'postback_sent_at' => 'datetime',
        ];
    }
}

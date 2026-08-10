<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClickTracking extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    protected $table = 'click_tracking';

    protected $fillable = [
        'session_id',
        'campaign_id',
        'adset_id',
        'ad_id',
        'event_type',
        'page',
        'payload',
        'event_time',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'event_time' => 'datetime',
        ];
    }
}

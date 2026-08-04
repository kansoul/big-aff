<?php

namespace App\Models;

use App\Enums\EventAdLoadType;
use App\Models\Traits\Relationship\EventAdLoadRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventAdLoad extends Model
{
    use EventAdLoadRelationship, HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'session_id',
        'campaign_id',
        'adset_id',
        'ad_id',
        'type',
        'container_type',
        'load_time_ms',
        'ad_loaded',
        'event_time',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'type' => EventAdLoadType::class,
            'ad_loaded' => 'boolean',
            'event_time' => 'datetime',
        ];
    }
}

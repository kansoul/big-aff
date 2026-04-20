<?php

namespace App\Models;

use App\Enums\EventPage;
use App\Enums\EventViewType;
use App\Models\Traits\Relationship\EventViewRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventView extends Model
{
    use EventViewRelationship, HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'session_id',
        'link_data_id',
        'campaign_id',
        'adset_id',
        'ad_id',
        'type',
        'page',
        'query',
        'event_time',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'type' => EventViewType::class,
            'page' => EventPage::class,
            'event_time' => 'datetime',
        ];
    }
}

<?php

namespace App\Models;

use App\Enums\EventClickType;
use App\Enums\EventPage;
use App\Models\Traits\Relationship\EventClickRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventClick extends Model
{
    use EventClickRelationship, HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'session_id',
        'campaign_id',
        'adset_id',
        'ad_id',
        'type',
        'page',
        'utm_source',
        'placement',
        'cpid',
        'lpid',
        'query',
        'keyword_clicked',
        'traffic',
        'event_time',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'type' => EventClickType::class,
            'page' => EventPage::class,
            'event_time' => 'datetime',
        ];
    }
}

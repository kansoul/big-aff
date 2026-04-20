<?php

namespace App\Models;

use App\Models\Traits\Relationship\TrackingSessionRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TrackingSession extends Model
{
    use HasFactory, TrackingSessionRelationship;

    protected $primaryKey = 'session_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'session_id',
        'ip_address',
        'device',
        'browser',
        'country',
        'referrer',
        'user_agent',
        'is_bot',
    ];

    protected function casts(): array
    {
        return [
            'is_bot' => 'boolean',
        ];
    }
}

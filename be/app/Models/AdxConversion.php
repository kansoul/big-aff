<?php

namespace App\Models;

use App\Models\Traits\Relationship\Adx\AdxConversionRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdxConversion extends Model
{
    use AdxConversionRelationship, HasFactory;

    protected $fillable = [
        'event_id',
        'adx_link_data_id',
        'source',
        'account_id',
        'campaign_id',
        'conversion_type',
        'conversion_action_id',
        'conversion_value',
        'currency',
        'gclid',
        'gbraid',
        'wbraid',
        'occurred_at',
        'sync_status',
        'synced_at',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'conversion_value' => 'decimal:4',
            'occurred_at' => 'datetime',
            'synced_at' => 'datetime',
        ];
    }
}

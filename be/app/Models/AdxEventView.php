<?php

namespace App\Models;

use App\Models\Traits\Relationship\Adx\AdxEventRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdxEventView extends Model
{
    use AdxEventRelationship, HasFactory;

    protected $fillable = [
        'adx_link_data_id',
        'page_key',
        'event_type',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
        ];
    }
}

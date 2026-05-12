<?php

namespace App\Models;

use App\Models\Traits\Relationship\Adx\AdxLinkDataRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdxLinkData extends Model
{
    use AdxLinkDataRelationship, HasFactory;

    protected $fillable = [
        'source',
        'account_id',
        'campaign_id',
        'adx_link_id',
        'adx_game_id',
        'gam_custom_key',
        'gam_custom_value',
        'first_seen_at',
        'last_seen_at',
    ];

    protected function casts(): array
    {
        return [
            'first_seen_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }
}

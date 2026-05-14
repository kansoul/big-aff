<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdxSpendReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'date',
        'source',
        'account_id',
        'account_name',
        'campaign_id',
        'campaign_name',
        'impressions',
        'clicks',
        'cost',
        'currency',
        'landing_view',
        'get_game_link_click',
        'detail_view',
        'get_bonus_click',
        'fetched_at',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'impressions' => 'integer',
            'clicks' => 'integer',
            'cost' => 'decimal:4',
            'landing_view' => 'decimal:4',
            'get_game_link_click' => 'decimal:4',
            'detail_view' => 'decimal:4',
            'get_bonus_click' => 'decimal:4',
            'fetched_at' => 'datetime',
        ];
    }
}

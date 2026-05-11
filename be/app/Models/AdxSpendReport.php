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
        'platform_conversions',
        'fetched_at',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'impressions' => 'integer',
            'clicks' => 'integer',
            'cost' => 'decimal:4',
            'platform_conversions' => 'decimal:4',
            'fetched_at' => 'datetime',
        ];
    }
}

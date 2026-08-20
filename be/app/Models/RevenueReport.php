<?php

namespace App\Models;

use App\Models\Traits\Relationship\RevenueReportRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RevenueReport extends Model
{
    use HasFactory, RevenueReportRelationship;

    protected $table = 'revenue_reports';

    protected $fillable = [
        'session_id',
        'campaign_id',
        'adset_id',
        'ad_id',
        'revenue',
        'revenue_received_at',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'revenue' => 'decimal:4',
            'revenue_received_at' => 'datetime',
        ];
    }
}

<?php

namespace App\Models;

use App\Models\Traits\Relationship\Adx\AdxRevenueReportRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdxRevenueReport extends Model
{
    use AdxRevenueReportRelationship, HasFactory;

    protected $fillable = [
        'date',
        'gam_network_code',
        'gam_custom_key',
        'gam_custom_value',
        'campaign_id',
        'adx_link_data_id',
        'adx_link_id',
        'adx_game_id',
        'ad_unit_id',
        'ad_unit_name',
        'impressions',
        'clicks',
        'requests',
        'matched_requests',
        'viewable_impressions',
        'adx_revenue',
        'ad_server_revenue',
        'total_revenue',
        'currency',
        'fetched_at',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'impressions' => 'integer',
            'clicks' => 'integer',
            'requests' => 'integer',
            'matched_requests' => 'integer',
            'viewable_impressions' => 'integer',
            'adx_revenue' => 'decimal:4',
            'ad_server_revenue' => 'decimal:4',
            'total_revenue' => 'decimal:4',
            'fetched_at' => 'datetime',
        ];
    }
}

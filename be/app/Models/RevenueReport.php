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
        'click_id',
        'estimate_earning',
        'revenue',
        'page_views',
        'clicks',
        'ad_requests',
        'impressions',
        'ad_requests_rpm',
        'impressions_rpm',
        'cost_per_click',
        'funnel_requests',
        'funnel_impressions',
        'funnel_clicks',
        'funnel_rpm',
    ];

    protected function casts(): array
    {
        return [
            'click_id' => 'integer',
            'estimate_earning' => 'decimal:4',
            'revenue' => 'decimal:4',
            'page_views' => 'integer',
            'clicks' => 'integer',
            'ad_requests' => 'integer',
            'impressions' => 'integer',
            'ad_requests_rpm' => 'decimal:4',
            'impressions_rpm' => 'decimal:4',
            'cost_per_click' => 'decimal:4',
            'funnel_requests' => 'integer',
            'funnel_impressions' => 'integer',
            'funnel_clicks' => 'integer',
            'funnel_rpm' => 'decimal:4',
        ];
    }
}

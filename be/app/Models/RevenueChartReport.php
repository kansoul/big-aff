<?php

namespace App\Models;

use App\Models\Traits\Relationship\RevenueChartReportRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RevenueChartReport extends Model
{
    use HasFactory, RevenueChartReportRelationship, SoftDeletes;

    protected $table = 'revenue_chart_reports';

    protected $fillable = [
        'ad_client_id',
        'style_code',
        'channel_code',
        'style_name',
        'datetime',
        'page_views',
        'clicks',
        'ad_requests',
        'impressions',
        'ad_requests_rpm',
        'impressions_rpm',
        'estimated_earnings',
        'cost_per_click',
        'funnel_requests',
        'funnel_impressions',
        'funnel_clicks',
        'funnel_rpm',
    ];

    protected function casts(): array
    {
        return [
            'datetime' => 'datetime',
            'page_views' => 'integer',
            'clicks' => 'integer',
            'ad_requests' => 'integer',
            'impressions' => 'integer',
            'ad_requests_rpm' => 'double',
            'impressions_rpm' => 'double',
            'estimated_earnings' => 'double',
            'cost_per_click' => 'double',
            'funnel_requests' => 'integer',
            'funnel_impressions' => 'integer',
            'funnel_clicks' => 'integer',
            'funnel_rpm' => 'double',
        ];
    }
}

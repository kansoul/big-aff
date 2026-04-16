<?php

namespace App\Models;

use App\Models\Traits\Relationship\InsightChartReportRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InsightChartReport extends Model
{
    use HasFactory, InsightChartReportRelationship, SoftDeletes;

    protected $table = 'insight_chart_reports';

    protected $fillable = [
        'account_id',
        'campaign_id',
        'datetime_start',
        'impressions',
        'reach',
        'clicks',
        'ad_clicks',
        'article_views',
        'search_views',
        'search_clicks',
        'cpa',
        'ctr_link',
        'cpc_link',
        'spend',
        'cpc',
        'cpm',
        'ctr',
        'frequency',
        'spend_type',
    ];

    protected function casts(): array
    {
        return [
            'datetime_start' => 'datetime',
            'impressions' => 'integer',
            'reach' => 'integer',
            'clicks' => 'integer',
            'ad_clicks' => 'integer',
            'article_views' => 'integer',
            'search_views' => 'integer',
            'search_clicks' => 'integer',
            'cpa' => 'double',
            'ctr_link' => 'double',
            'cpc_link' => 'double',
            'spend' => 'float',
            'cpc' => 'float',
            'cpm' => 'float',
            'ctr' => 'float',
            'frequency' => 'float',
        ];
    }
}

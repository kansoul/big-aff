<?php

namespace App\Models;

use App\Models\Traits\Relationship\AdsInsightsReportRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AdsInsightsReport extends Model
{
    use AdsInsightsReportRelationship, HasFactory, SoftDeletes;

    protected $table = 'ads_insights_reports';

    protected $fillable = [
        'ad_id',
        'ad_name',
        'adset_id',
        'campaign_id',
        'account_id',
        'status',
        'daily_budget',
        'spend',
        'date_start',
        'date_stop',
        'impressions',
        'clicks',
        'reach',
        'cpc',
        'cpm',
        'ctr',
        'cpa',
        'ad_clicks',
        'article_views',
        'search_views',
        'search_click',
        'inline_link_click_ctr',
        'cost_per_inline_link_click',
        'frequency',
        'effective_status',
        'updated_time',
        'created_time',
    ];

    protected function casts(): array
    {
        return [
            'daily_budget' => 'decimal:2',
            'spend' => 'float',
            'date_start' => 'date',
            'date_stop' => 'date',
            'impressions' => 'integer',
            'clicks' => 'integer',
            'reach' => 'integer',
            'cpc' => 'float',
            'cpm' => 'float',
            'ctr' => 'float',
            'cpa' => 'double',
            'ad_clicks' => 'integer',
            'article_views' => 'integer',
            'search_views' => 'integer',
            'search_click' => 'integer',
            'inline_link_click_ctr' => 'double',
            'cost_per_inline_link_click' => 'double',
            'frequency' => 'float',
            'updated_time' => 'datetime',
            'created_time' => 'datetime',
        ];
    }
}

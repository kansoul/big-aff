<?php

namespace App\Models;

use App\Models\Traits\Relationship\InsightReportRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InsightReport extends Model
{
    use HasFactory, InsightReportRelationship, SoftDeletes;

    protected $table = 'insight_reports';

    protected $fillable = [
        'account_id',
        'campaign_id',
        'date_start',
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
            'date_start' => 'date',
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

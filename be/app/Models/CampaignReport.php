<?php

namespace App\Models;

use App\Models\Traits\Attribute\CampaignReportAttribute;
use App\Models\Traits\Relationship\CampaignReportRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CampaignReport extends Model
{
    use CampaignReportAttribute, CampaignReportRelationship, HasFactory;

    protected $table = 'campaign_reports';

    public $timestamps = false;

    protected $fillable = [
        'realtime_report_id',
        'date_start',
        'account_id',
        'owner_user_id',
        'account_name',
        'campaign_id',
        'campaign_name',
        'campaign_status',
        'ads_type',
        'daily_budget',
        'lifetime_budget',
        'target_cpa',
        'bidding_strategy_type',
        // adsense / revenue
        'style_code',
        'style_name',
        'channel_code',
        'channel_name',
        'r_search_views',
        'r_conversion',
        'r_revenue',
        'r_rpc',
        'r_ad_requests',
        'r_ad_requests_rpm',
        'r_impressions',
        'r_impressions_rpm',
        'r_funnel_requests',
        'r_funnel_clicks',
        'r_funnel_impressions',
        'r_funnel_rpm',
        'r_cpa',
        // ads / spend
        'a_ad_clicks',
        'a_article_views',
        'a_search_views',
        'a_conversion',
        'a_spend',
        'a_impressions',
        'a_cpc',
        'a_cpm',
        'a_ctr',
        'a_reach',
        'a_cpa',
        'a_ctr_link',
        'a_cpc_link',
        'a_frequency',
        'a_clicks',
    ];

    protected function casts(): array
    {
        return [
            'date_start' => 'date',
            'owner_user_id' => 'integer',
            'daily_budget' => 'decimal:2',
            'lifetime_budget' => 'decimal:2',
            'target_cpa' => 'decimal:2',
            'bidding_strategy_type' => 'integer',
            'r_search_views' => 'integer',
            'r_conversion' => 'integer',
            'r_revenue' => 'decimal:2',
            'r_rpc' => 'decimal:4',
            'r_ad_requests' => 'integer',
            'r_ad_requests_rpm' => 'decimal:4',
            'r_impressions' => 'integer',
            'r_impressions_rpm' => 'decimal:4',
            'r_funnel_requests' => 'integer',
            'r_funnel_clicks' => 'integer',
            'r_funnel_impressions' => 'integer',
            'r_funnel_rpm' => 'decimal:4',
            'r_cpa' => 'decimal:4',
            'a_ad_clicks' => 'integer',
            'a_article_views' => 'integer',
            'a_search_views' => 'integer',
            'a_conversion' => 'integer',
            'a_spend' => 'decimal:2',
            'a_impressions' => 'integer',
            'a_cpc' => 'decimal:4',
            'a_cpm' => 'decimal:4',
            'a_ctr' => 'decimal:4',
            'a_reach' => 'integer',
            'a_cpa' => 'decimal:4',
            'a_ctr_link' => 'decimal:4',
            'a_cpc_link' => 'decimal:4',
            'a_frequency' => 'decimal:4',
            'a_clicks' => 'integer',
        ];
    }
}

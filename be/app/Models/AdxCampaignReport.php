<?php

namespace App\Models;

use App\Models\Traits\Relationship\Adx\AdxCampaignReportRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdxCampaignReport extends Model
{
    use AdxCampaignReportRelationship, HasFactory;

    protected $fillable = [
        'date',
        'source',
        'adx_account_id',
        'adx_campaign_id',
        'adx_link_data_id',
        'adx_link_id',
        'adx_game_id',
        'adx_realtime_report_id',
        'account_id',
        'account_name',
        'campaign_id',
        'campaign_name',
        'campaign_status',
        'daily_budget',
        'lifetime_budget',
        'spend',
        'revenue',
        'profit',
        'roi',
        'roas',
        'ads_clicks',
        'ads_impressions',
        'landing_view',
        'get_game_link_click',
        'detail_view',
        'get_bonus_click',
        'adx_impressions',
        'adx_clicks',
        'adx_requests',
        'adx_matched_requests',
        'adx_viewable_impressions',
        'cpc',
        'epc',
        'rpm',
        'currency',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'daily_budget' => 'decimal:4',
            'lifetime_budget' => 'decimal:4',
            'spend' => 'decimal:4',
            'revenue' => 'decimal:4',
            'profit' => 'decimal:4',
            'roi' => 'decimal:4',
            'roas' => 'decimal:4',
            'landing_view' => 'decimal:4',
            'get_game_link_click' => 'decimal:4',
            'detail_view' => 'decimal:4',
            'get_bonus_click' => 'decimal:4',
            'cpc' => 'decimal:4',
            'epc' => 'decimal:4',
            'rpm' => 'decimal:4',
        ];
    }
}

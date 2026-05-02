<?php

namespace App\Models\Traits\Relationship;

use App\Enums\EventClickType;
use App\Models\Account;
use App\Models\AdsetInsightsReport;
use App\Models\Campaign;
use App\Models\CampaignReport;
use App\Models\EventClick;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

trait AdsInsightsReportRelationship
{
    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'account_id', 'account_id');
    }

    /**
     * @return BelongsTo<Campaign, $this>
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'campaign_id', 'campaign_id');
    }

    /**
     * @return BelongsTo<AdsetInsightsReport, $this>
     */
    public function adset(): BelongsTo
    {
        return $this->belongsTo(AdsetInsightsReport::class, 'adset_id', 'adset_id');
    }

    /**
     * @return HasMany<EventClick, $this>
     */
    public function eventClicks(): HasMany
    {
        return $this->hasMany(EventClick::class, 'ad_id', 'ad_id');
    }

    /**
     * @return Builder<EventClick>
     */
    public static function conversionRealtimeSubquery(): Builder
    {
        return EventClick::query()
            ->selectRaw('COUNT(*)')
            ->whereColumn('event_clicks.ad_id', 'ads_insights_reports.ad_id')
            ->where('event_clicks.type', EventClickType::ClickAd->value)
            ->whereRaw('DATE(event_clicks.created_at) = ads_insights_reports.date_start');
    }

    /**
     * @return Builder<CampaignReport>
     */
    public static function rpcEstSubquery(): Builder
    {
        return CampaignReport::query()
            ->select('r_rpc')
            ->whereColumn('campaign_reports.campaign_id', 'ads_insights_reports.campaign_id')
            ->whereColumn('campaign_reports.date_start', '<=', 'ads_insights_reports.date_start')
            ->whereNotNull('campaign_reports.r_rpc')
            ->orderByDesc('campaign_reports.date_start')
            ->limit(1);
    }
}

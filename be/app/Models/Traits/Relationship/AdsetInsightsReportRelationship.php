<?php

namespace App\Models\Traits\Relationship;

use App\Enums\EventClickType;
use App\Models\Account;
use App\Models\AdsInsightsReport;
use App\Models\Campaign;
use App\Models\CampaignReport;
use App\Models\CampaignRule;
use App\Models\EventClick;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphToMany;

trait AdsetInsightsReportRelationship
{
    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'account_id', 'account_id');
    }

    /**
     * @return MorphToMany<CampaignRule, $this>
     */
    public function campaignRules(): MorphToMany
    {
        return $this->morphToMany(CampaignRule::class, 'sourceable', 'campaign_apply_rules', parentKey: 'adset_id');
    }

    /**
     * @return BelongsTo<Campaign, $this>
     */
    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class, 'campaign_id', 'campaign_id');
    }

    /**
     * @return HasMany<AdsInsightsReport, $this>
     */
    public function ads(): HasMany
    {
        return $this->hasMany(AdsInsightsReport::class, 'adset_id', 'adset_id');
    }

    /**
     * @return HasMany<EventClick, $this>
     */
    public function eventClicks(): HasMany
    {
        return $this->hasMany(EventClick::class, 'adset_id', 'adset_id');
    }

    /**
     * @return Builder<EventClick>
     */
    public static function conversionRealtimeSubquery(): Builder
    {
        return EventClick::query()
            ->selectRaw('COUNT(*)')
            ->whereColumn('event_clicks.adset_id', 'adset_insights_reports.adset_id')
            ->where('event_clicks.type', EventClickType::ClickAd->value)
            ->whereColumn('event_clicks.created_at', '>=', 'adset_insights_reports.date_start')
            ->whereRaw('event_clicks.created_at < DATE_ADD(adset_insights_reports.date_start, INTERVAL 1 DAY)');
    }

    /**
     * @return Builder<CampaignReport>
     */
    public static function rpcEstSubquery(): Builder
    {
        return CampaignReport::query()
            ->select('r_rpc')
            ->whereColumn('campaign_reports.campaign_id', 'adset_insights_reports.campaign_id')
            ->whereColumn('campaign_reports.date_start', '<=', 'adset_insights_reports.date_start')
            ->whereNotNull('campaign_reports.r_rpc')
            ->orderByDesc('campaign_reports.date_start')
            ->limit(1);
    }
}

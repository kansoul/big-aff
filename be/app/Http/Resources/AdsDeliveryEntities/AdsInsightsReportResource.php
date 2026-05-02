<?php

namespace App\Http\Resources\AdsDeliveryEntities;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdsInsightsReportResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $clickAdRealtime = (int) ($this->conversion_realtime ?? 0);
        $rRpc = (float) ($this->rpc_est ?? 0);
        $spend = (float) ($this->spend ?? 0);
        $revenueEst = $rRpc * $clickAdRealtime;

        return [
            'id' => $this->id,
            'ad_id' => $this->ad_id,
            'ad_name' => $this->ad_name,
            'adset_id' => $this->adset_id,
            'campaign_id' => $this->campaign_id,
            'account_id' => $this->account_id,
            'status' => $this->status,
            'status_toggleable' => in_array($this->status, ['ACTIVE', 'PAUSED'], true),
            'effective_status' => $this->effective_status,
            'daily_budget' => $this->daily_budget !== null ? (float) $this->daily_budget : null,
            'spend' => $this->spend,
            'date_start' => $this->date_start?->toDateString(),
            'date_stop' => $this->date_stop?->toDateString(),
            'impressions' => $this->impressions,
            'clicks' => $this->clicks,
            'reach' => $this->reach,
            'cpc' => $this->cpc,
            'cpm' => $this->cpm,
            'ctr' => $this->ctr,
            'cpa' => $this->cpa,
            'ad_clicks' => $this->ad_clicks,
            'article_views' => $this->article_views,
            'search_views' => $this->search_views,
            'ads_conv' => $this->ads_conv,
            'inline_link_click_ctr' => $this->inline_link_click_ctr,
            'cost_per_inline_link_click' => $this->cost_per_inline_link_click,
            'frequency' => $this->frequency,
            // realtime computed
            'conversion_realtime' => $clickAdRealtime,
            'rpc_est' => $rRpc ?: null,
            'revenue_est' => $revenueEst ?: null,
            'profit_realtime' => $spend > 0 ? round($revenueEst - $spend, 4) : null,
            'roi_realtime' => $spend > 0 ? round(($revenueEst - $spend) / $spend * 100, 2) : null,
            'cpa_realtime' => $clickAdRealtime > 0 ? round($spend / $clickAdRealtime, 4) : null,
            // timestamps
            'updated_time' => $this->updated_time?->toISOString(),
            'created_time' => $this->created_time?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

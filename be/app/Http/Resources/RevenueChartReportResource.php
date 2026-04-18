<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RevenueChartReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $realEarnings = (float) ($this->real_earnings ?? 0);
        $realClicks = (int) ($this->real_clicks ?? 0);
        $realAdRequests = (int) ($this->real_ad_requests ?? 0);
        $realImpressions = (int) ($this->real_impressions ?? 0);
        $realFunnelRequests = (int) ($this->real_funnel_requests ?? 0);

        return [
            'id' => $this->id,
            'ad_client_id' => $this->ad_client_id,
            'style_code' => $this->style_code,
            'style_name' => $this->style_name,
            'channel_code' => $this->channel_code,
            'channel_name' => $this->channel_name,
            'datetime' => $this->datetime?->toIso8601String(),

            // Raw cumulative fields
            'estimated_earnings' => $this->estimated_earnings,
            'clicks' => $this->clicks,
            'page_views' => $this->page_views,
            'ad_requests' => $this->ad_requests,
            'impressions' => $this->impressions,
            'funnel_requests' => $this->funnel_requests,
            'funnel_impressions' => $this->funnel_impressions,
            'funnel_clicks' => $this->funnel_clicks,

            // Delta (real) computed via LAG window function
            'real_earnings' => $realEarnings,
            'real_clicks' => $realClicks,
            'real_page_views' => (int) ($this->real_page_views ?? 0),
            'real_ad_requests' => $realAdRequests,
            'real_impressions' => $realImpressions,
            'real_funnel_requests' => $realFunnelRequests,
            'real_funnel_impressions' => (int) ($this->real_funnel_impressions ?? 0),
            'real_funnel_clicks' => (int) ($this->real_funnel_clicks ?? 0),

            // Derived metrics
            'rpc' => $realClicks > 0 ? round($realEarnings / $realClicks, 6) : 0,
            'ad_requests_rpm' => $realAdRequests > 0 ? round(($realEarnings / $realAdRequests) * 1000, 6) : 0,
            'impressions_rpm' => $realImpressions > 0 ? round(($realEarnings / $realImpressions) * 1000, 6) : 0,
            'funnel_rpm' => $realFunnelRequests > 0 ? round(($realEarnings / $realFunnelRequests) * 1000, 6) : 0,

            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

<?php

namespace App\Http\Resources;

use App\Models\RevenueReport;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin RevenueReport
 */
class RevenueReportResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'session_id' => $this->session_id,
            'campaign_id' => $this->campaign_id,
            'adset_id' => $this->adset_id,
            'ad_id' => $this->ad_id,
            'click_id' => $this->click_id,
            'estimate_earning' => (float) $this->estimate_earning,
            'page_views' => $this->page_views,
            'clicks' => $this->clicks,
            'ad_requests' => $this->ad_requests,
            'impressions' => $this->impressions,
            'ad_requests_rpm' => $this->ad_requests_rpm !== null ? (float) $this->ad_requests_rpm : null,
            'impressions_rpm' => $this->impressions_rpm !== null ? (float) $this->impressions_rpm : null,
            'cost_per_click' => $this->cost_per_click !== null ? (float) $this->cost_per_click : null,
            'funnel_requests' => $this->funnel_requests,
            'funnel_impressions' => $this->funnel_impressions,
            'funnel_clicks' => $this->funnel_clicks,
            'funnel_rpm' => $this->funnel_rpm !== null ? (float) $this->funnel_rpm : null,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

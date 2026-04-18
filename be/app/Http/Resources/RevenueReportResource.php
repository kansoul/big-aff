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
            'ad_client_id' => $this->ad_client_id,
            'style_code' => $this->style_code,
            'style_name' => $this->style_name,
            'channel_code' => $this->channel_code,
            'channel_name' => $this->channel_name,
            'date' => $this->date?->format('Y-m-d'),
            'page_views' => $this->page_views,
            'clicks' => $this->clicks,
            'estimated_earnings' => $this->estimated_earnings,
            'ad_requests' => $this->ad_requests,
            'impressions' => $this->impressions,
            'ad_requests_rpm' => $this->ad_requests_rpm,
            'impressions_rpm' => $this->impressions_rpm,
            'cost_per_click' => $this->cost_per_click,
            'funnel_requests' => $this->funnel_requests,
            'funnel_impressions' => $this->funnel_impressions,
            'funnel_clicks' => $this->funnel_clicks,
            'funnel_rpm' => $this->funnel_rpm,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

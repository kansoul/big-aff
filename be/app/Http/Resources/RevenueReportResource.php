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
            'revenue' => (float) $this->revenue,
            'revenue_received_at' => $this->revenue_received_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

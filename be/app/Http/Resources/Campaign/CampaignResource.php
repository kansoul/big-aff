<?php

namespace App\Http\Resources\Campaign;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CampaignResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'campaign_id' => $this->campaign_id,
            'campaign_name' => $this->campaign_name,
            'account_id' => $this->account_id,
            'account_name' => $this->account_name,
            'total_spend' => (float) $this->total_spend,
            'total_revenue' => (float) $this->total_revenue,
            'profit' => (float) $this->profit,
        ];
    }
}

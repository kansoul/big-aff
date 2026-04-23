<?php

namespace App\Http\Resources\Campaign;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdsSelectorResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'ad_id' => $this->ad_id,
            'ad_name' => $this->ad_name,
            'adset_id' => $this->adset_id,
            'campaign_id' => $this->campaign_id,
            'account_id' => $this->account_id,
            'date_start' => $this->date_start?->toDateString(),
            'spend' => (float) $this->spend,
            'cpa' => (float) $this->cpa,
        ];
    }
}

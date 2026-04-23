<?php

namespace App\Http\Resources\Campaign;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdsetSelectorResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'adset_id' => $this->adset_id,
            'adset_name' => $this->adset_name,
            'campaign_id' => $this->campaign_id,
            'account_id' => $this->account_id,
            'date_start' => $this->date_start?->toDateString(),
            'spend' => (float) $this->spend,
            'cpa' => (float) $this->cpa,
        ];
    }
}

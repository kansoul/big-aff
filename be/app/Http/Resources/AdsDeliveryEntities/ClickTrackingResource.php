<?php

namespace App\Http\Resources\AdsDeliveryEntities;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClickTrackingResource extends JsonResource
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
            'event_type' => $this->event_type,
            'page' => $this->page,
            'payload' => $this->payload,
            'event_time' => $this->event_time?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}

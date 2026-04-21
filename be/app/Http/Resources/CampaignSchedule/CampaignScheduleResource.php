<?php

namespace App\Http\Resources\CampaignSchedule;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CampaignScheduleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'turn_on_time' => $this->turn_on_time,
            'turn_off_time' => $this->turn_off_time,
            'is_active' => $this->is_active,
            'created_by' => $this->created_by,
            'creator' => $this->whenLoaded('creator', fn () => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'campaign_ids' => $this->whenLoaded('items', fn () => $this->items->pluck('campaign_id')->values()),
            'items_count' => $this->whenLoaded('items', fn () => $this->items->count()),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

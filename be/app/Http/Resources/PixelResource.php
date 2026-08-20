<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PixelResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'pixel_id' => $this->pixel_id,
            'name' => $this->name,
            'platform' => $this->platform->value,
            'business_center_id' => $this->business_center_id,
            'business_center' => $this->whenLoaded('businessCenter', fn () => [
                'id' => $this->businessCenter?->id,
                'bc_id' => $this->businessCenter?->bc_id,
                'name' => $this->businessCenter?->name,
                'ads_type' => $this->businessCenter?->ads_type,
            ]),
            'status' => $this->status->value,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

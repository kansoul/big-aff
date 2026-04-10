<?php

namespace App\Http\Resources;

use App\Models\BusinessCenter;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin BusinessCenter
 */
class BusinessCenterResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'bc_id' => $this->bc_id,
            'name' => $this->name,
            'ads_type' => $this->ads_type,
            'team_id' => $this->team_id,
            'team' => $this->whenLoaded('team', fn () => [
                'id' => $this->team?->id,
                'name' => $this->team?->name,
            ]),
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

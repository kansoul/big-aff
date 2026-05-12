<?php

namespace App\Http\Resources\Adx;

use App\Models\AdxLink;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AdxLink
 */
class AdxLinkResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'adx_game_id' => $this->adx_game_id,
            'game' => $this->whenLoaded('game', fn () => [
                'id' => $this->game?->id,
                'name' => $this->game?->name,
                'slug' => $this->game?->slug,
            ]),
            'name' => $this->name,
            'slug' => $this->slug,
            'source' => $this->source,
            'landing_url' => $this->landing_url,
            'url_template' => $this->url_template,
            'status' => $this->status,
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

<?php

namespace App\Http\Resources\Adx;

use App\Models\AdxLinkData;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AdxLinkData
 */
class AdxLinkDataResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'source' => $this->source,
            'account_id' => $this->account_id,
            'campaign_id' => $this->campaign_id,
            'adx_link_id' => $this->adx_link_id,
            'adx_game_id' => $this->adx_game_id,
            'link' => $this->whenLoaded('link', fn () => $this->link ? [
                'id' => $this->link->id,
                'name' => $this->link->name,
                'slug' => $this->link->slug,
            ] : null),
            'game' => $this->whenLoaded('game', fn () => $this->game ? [
                'id' => $this->game->id,
                'name' => $this->game->name,
                'slug' => $this->game->slug,
            ] : null),
            'gam_custom_key' => $this->gam_custom_key,
            'gam_custom_value' => $this->gam_custom_value,
            'first_seen_at' => $this->first_seen_at,
            'last_seen_at' => $this->last_seen_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

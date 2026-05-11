<?php

namespace App\Http\Resources\Adx;

use App\Models\AdxGame;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AdxGame
 */
class AdxGameResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'thumbnail' => $this->thumbnail,
            'description' => $this->description,
            'game_url' => $this->game_url,
            'status' => $this->status,
            'sort_order' => $this->sort_order,
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

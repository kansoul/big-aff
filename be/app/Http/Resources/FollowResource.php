<?php

namespace App\Http\Resources;

use App\Models\Follow;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Follow
 */
class FollowResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'site_id' => $this->site_id,
            'post_id' => $this->post_id,
            'ads_link_id' => $this->ads_link_id,
            'style_code' => $this->style_code,
            'channel_code' => $this->channel_code,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

<?php

namespace App\Http\Resources;

use App\Models\AdsLink;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AdsLink
 */
class AdsLinkResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $trackingIds = $this->tracking_ids ?? [];

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'rac' => $this->rac,
            'note' => $this->note,
            'is_hidden' => $this->is_hidden,
            'channel_code' => $this->channel_code,
            'style_code' => $this->style_code,
            'fbid' => $trackingIds['fbid'] ?? null,
            'googleid' => $trackingIds['googleid'] ?? null,
            'site' => $this->whenLoaded('site', fn () => [
                'id' => $this->site->id,
                'name' => $this->site->name,
                'url' => $this->site->url,
            ]),
            'post' => $this->whenLoaded('post', fn () => [
                'id' => $this->post->id,
                'title' => $this->post->title,
                'slug' => $this->post->slug,
            ]),
            'keyword_set' => $this->whenLoaded('keywordSet', fn () => $this->keywordSet ? [
                'id' => $this->keywordSet->id,
                'name' => $this->keywordSet->name,
            ] : null),
            'is_old' => $this->is_old,
            'created_by' => $this->created_by,
            'updated_by' => $this->updated_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

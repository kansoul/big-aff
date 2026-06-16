<?php

namespace App\Http\Resources\Post;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PostBySlugResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $domain = $request->header('x-internal-site');
        $domain = 'https://'.preg_replace('/^https?:\/\//', '', rtrim($domain, '/'));

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'lang' => $this->lang,
            'description' => $this->description,
            'content' => $this->getContentWithFullImageUrls($domain),
            'type' => $this->type,
            'status' => $this->status,
            'published_at' => $this->published_at?->toISOString(),
            'rac' => $this->rac ?? $this->title,
            'keyword_set' => $this->keyword_sets ? implode(', ', $this->keyword_sets) : null,
            'feature_media' => $this->getFeatureMediaUrl($domain),
            'style' => $this->style ?? null,
            'channel' => $this->channel ?? null,
            'campaign_id' => $this->campaign_id ?? null,
            'account_id' => $this->account_id ?? null,
            'gtag' => $this->gtag ?? null,
            'ggid' => $this->ggid ?? null,
            'fbid' => $this->fbid ?? null,
            'traffic_type' => $this->traffic_type ?? null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    /**
     * Get content with full image URLs.
     */
    private function getContentWithFullImageUrls(string $domain): ?string
    {
        if (empty($this->content)) {
            return $this->content;
        }

        return preg_replace_callback('/src="([^"]*\/storage\/([^"]+))"/i', function ($matches) use ($domain) {
            $pathAfterStorage = $matches[2];

            return 'src="'.$domain.'/'.ltrim($pathAfterStorage, '/').'"';
        }, $this->content);
    }

    /**
     * Get feature media URL.
     */
    private function getFeatureMediaUrl(string $domain): ?string
    {
        if (empty($this->featureMedia)) {
            return null;
        }

        return $domain.'/'.ltrim($this->featureMedia->path, '/');
    }
}

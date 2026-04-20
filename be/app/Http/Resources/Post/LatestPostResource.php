<?php

namespace App\Http\Resources\Post;

use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Post
 */
class LatestPostResource extends JsonResource
{
    /**
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
            'description' => $this->description,
            'feature_media' => $this->getFeatureMediaUrl($domain),
            'category' => $this->whenLoaded('category', fn () => $this->category ? [
                'id' => $this->category->id,
                'name' => $this->category->name,
            ] : null),
            'published_at' => $this->published_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }

    private function getFeatureMediaUrl(string $domain): ?string
    {
        if (empty($this->featureMedia)) {
            return null;
        }

        return $domain.'/'.ltrim($this->featureMedia->path, '/');
    }
}

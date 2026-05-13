<?php

namespace App\Http\Resources\Blog;

use App\Http\Resources\KeywordSetResource;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Post */
class BlogPostDetailResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $domain = $this->resolveDomain($request);

        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'lang' => $this->lang,
            'description' => $this->description,
            'content' => $this->content,
            'feature_media' => $this->resolveFeatureMediaUrl($domain),
            'category' => $this->whenLoaded('category', fn () => $this->category ? [
                'id' => $this->category->id,
                'name' => $this->category->name,
            ] : null),
            'keyword_sets' => KeywordSetResource::collection($this->whenLoaded('keywordSets')),
            'published_at' => $this->published_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }

    private function resolveDomain(Request $request): string
    {
        $domain = $request->header('x-internal-site', '');

        return 'https://'.preg_replace('/^https?:\/\//', '', rtrim($domain, '/'));
    }

    private function resolveFeatureMediaUrl(string $domain): ?string
    {
        if (empty($this->featureMedia)) {
            return null;
        }

        return $domain.'/'.ltrim($this->featureMedia->path, '/');
    }
}

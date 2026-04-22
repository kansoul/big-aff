<?php

namespace App\Http\Resources\Post;

use App\Http\Resources\FileResource;
use App\Http\Resources\KeywordSetResource;
use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Post
 */
class PostResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'lang' => $this->lang,
            'note' => $this->note,
            'description' => $this->description,
            'content' => $this->content,
            'feature_media_id' => $this->feature_media_id,
            'feature_media' => new FileResource($this->whenLoaded('featureMedia')),
            'status' => $this->status,
            'is_hidden' => $this->is_hidden,
            'type' => $this->type,
            'category_id' => $this->category_id,
            'category' => $this->whenLoaded('category', fn() => [
                'id' => $this->category?->id,
                'name' => $this->category?->name,
            ]),
            'keyword_sets' => KeywordSetResource::collection($this->whenLoaded('keywordSets')),
            'created_by' => $this->creator?->email,
            'updated_by' => $this->updated_by,
            'published_at' => $this->published_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

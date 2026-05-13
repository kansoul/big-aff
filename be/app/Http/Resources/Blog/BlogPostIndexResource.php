<?php

namespace App\Http\Resources\Blog;

use App\Models\Post;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Post */
class BlogPostIndexResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'title' => $this->title,
            'slug' => $this->slug,
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

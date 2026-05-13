<?php

namespace App\Actions\Blog;

use App\Enums\PostStatus;
use App\Models\Post;
use Illuminate\Database\Eloquent\Collection;

class IndexBlogPostsAction
{
    public function execute(): Collection
    {
        return Post::query()
            ->select('title', 'slug', 'updated_at')
            ->where('status', PostStatus::PUBLISHED)
            ->where('is_hidden', false)
            ->orderBy('created_at')
            ->get()
            ->unique('title')
            ->values();
    }
}

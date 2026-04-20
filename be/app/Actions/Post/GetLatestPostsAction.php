<?php

namespace App\Actions\Post;

use App\Enums\PostStatus;
use App\Models\Post;
use Illuminate\Database\Eloquent\Collection;

class GetLatestPostsAction
{
    public function execute(int $limit = 10): Collection
    {
        return Post::query()
            ->with(['featureMedia', 'category'])
            ->where('status', PostStatus::PUBLISHED)
            ->where('is_hidden', false)
            ->whereNotNull('published_at')
            ->orderByDesc('published_at')
            ->limit($limit)
            ->get();
    }
}

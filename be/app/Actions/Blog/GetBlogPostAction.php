<?php

namespace App\Actions\Blog;

use App\Enums\PostStatus;
use App\Models\Post;

class GetBlogPostAction
{
    public function execute(int $id): ?Post
    {
        return Post::query()
            ->with(['featureMedia', 'category', 'keywordSets'])
            ->where('status', PostStatus::PUBLISHED)
            ->where('is_hidden', false)
            ->find($id);
    }
}

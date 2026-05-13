<?php

namespace App\Actions\Blog;

use App\Enums\PostStatus;
use App\Models\Category;
use App\Models\Post;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Str;

class ListBlogPostsAction
{
    public function execute(int $limit, ?string $categorySlug = null): LengthAwarePaginator
    {
        $categoryId = null;

        if ($categorySlug !== null) {
            $categoryId = Category::all()
                ->first(fn (Category $cat) => Str::slug($cat->name) === $categorySlug)
                ?->id;
        }

        return Post::query()
            ->where('status', PostStatus::PUBLISHED)
            ->where('is_hidden', false)
            ->when($categoryId, fn ($q) => $q->where('category_id', $categoryId))
            ->orderByDesc('created_at')
            ->with(['featureMedia', 'category'])
            ->paginate($limit);
    }
}

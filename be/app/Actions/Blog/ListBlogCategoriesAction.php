<?php

namespace App\Actions\Blog;

use App\Models\Category;
use Illuminate\Database\Eloquent\Collection;

class ListBlogCategoriesAction
{
    public function execute(int $limit): Collection
    {
        return Category::query()
            ->orderBy('created_at')
            ->limit($limit)
            ->get();
    }
}

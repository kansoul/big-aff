<?php

namespace App\Services\Blog;

use App\Actions\Blog\GetBlogPostAction;
use App\Actions\Blog\ListBlogCategoriesAction;
use App\Actions\Blog\ListBlogPostsAction;
use App\Models\Post;
use Illuminate\Database\Eloquent\Collection;

class BlogService
{
    public function __construct(
        private readonly ListBlogPostsAction $listPostsAction,
        private readonly GetBlogPostAction $getPostAction,
        private readonly ListBlogCategoriesAction $listCategoriesAction,
    ) {}

    public function listPosts(int $limit, ?int $categoryId = null): Collection
    {
        return $this->listPostsAction->execute($limit, $categoryId);
    }

    public function getPost(int $id): ?Post
    {
        return $this->getPostAction->execute($id);
    }

    public function listCategories(int $limit): Collection
    {
        return $this->listCategoriesAction->execute($limit);
    }
}

<?php

namespace App\Services\Blog;

use App\Actions\Blog\GetBlogPostAction;
use App\Actions\Blog\IndexBlogPostsAction;
use App\Actions\Blog\ListBlogCategoriesAction;
use App\Actions\Blog\ListBlogPostsAction;
use App\Models\Post;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class BlogService
{
    public function __construct(
        private readonly ListBlogPostsAction $listPostsAction,
        private readonly IndexBlogPostsAction $indexPostsAction,
        private readonly GetBlogPostAction $getPostAction,
        private readonly ListBlogCategoriesAction $listCategoriesAction,
    ) {}

    public function listPosts(int $limit, ?string $categorySlug = null): LengthAwarePaginator
    {
        return $this->listPostsAction->execute($limit, $categorySlug);
    }

    public function indexPosts(): Collection
    {
        return $this->indexPostsAction->execute();
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

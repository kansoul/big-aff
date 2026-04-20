<?php

namespace App\Services\Post;

use App\Actions\Post\CreatePostAction;
use App\Actions\Post\DeletePostAction;
use App\Actions\Post\GetPostBySlugAction;
use App\Actions\Post\GetPostOptionsAction;
use App\Actions\Post\ListPostsAction;
use App\Actions\Post\SearchPostsAction;
use App\Actions\Post\UpdatePostAction;
use App\Models\Post;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Collection;

class PostService
{
    public function __construct(
        private readonly ListPostsAction $listPostsAction,
        private readonly CreatePostAction $createPostAction,
        private readonly UpdatePostAction $updatePostAction,
        private readonly DeletePostAction $deletePostAction,
        private readonly GetPostOptionsAction $getPostOptionsAction,
        private readonly GetPostBySlugAction $getPostBySlugAction,
        private readonly SearchPostsAction $searchPostsAction,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public function list(array $filters): LengthAwarePaginator
    {
        return $this->listPostsAction->execute($filters);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Post
    {
        return $this->createPostAction->execute($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Post $post, array $data): Post
    {
        return $this->updatePostAction->execute($post, $data);
    }

    public function delete(Post $post): void
    {
        $this->deletePostAction->execute($post);
    }

    /**
     * @return Collection<int, array{id: int, title: string, slug: string, keyword_sets: array<int, array{id: int, name: string}>}>
     */
    public function options(): Collection
    {
        return $this->getPostOptionsAction->execute();
    }

    /**
     * Get post by slug
     *
     * @param  array<string, mixed>  $filters
     */
    public function getPostBySlug(string $slug, array $filters): ?Post
    {
        return $this->getPostBySlugAction->execute($slug, $filters);
    }

    /**
     * Search posts
     *
     * @param  array<string, mixed>  $filters
     */
    public function searchPosts(array $filters): AnonymousResourceCollection
    {
        return $this->searchPostsAction->execute($filters);
    }
}

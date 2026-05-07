<?php

namespace App\Services\Post;

use App\Actions\Post\AssignPostUsersAction;
use App\Actions\Post\CreatePostAction;
use App\Actions\Post\DeletePostAction;
use App\Actions\Post\GetLatestPostsAction;
use App\Actions\Post\GetPostBySlugAction;
use App\Actions\Post\GetPostUserOptionsAction;
use App\Actions\Post\ListPostsAction;
use App\Actions\Post\SearchPostsAction;
use App\Actions\Post\ToggleHiddenPostAction;
use App\Actions\Post\UpdatePostAction;
use App\Models\Post;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Collection;

class PostService
{
    public function __construct(
        private readonly ListPostsAction $listPostsAction,
        private readonly CreatePostAction $createPostAction,
        private readonly UpdatePostAction $updatePostAction,
        private readonly DeletePostAction $deletePostAction,
        private readonly AssignPostUsersAction $assignPostUsersAction,
        private readonly GetPostUserOptionsAction $getPostUserOptionsAction,
        private readonly GetPostBySlugAction $getPostBySlugAction,
        private readonly SearchPostsAction $searchPostsAction,
        private readonly GetLatestPostsAction $getLatestPostsAction,
        private readonly ToggleHiddenPostAction $toggleHiddenPostAction,
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

    public function toggleHidden(Post $post, bool $isHidden): Post
    {
        return $this->toggleHiddenPostAction->execute($post, $isHidden);
    }

    /**
     * @param  array<int>  $userIds
     */
    public function assignUsers(Post $post, array $userIds): void
    {
        $this->assignPostUsersAction->execute($post, $userIds);
    }

    /**
     * @return array{options: Collection<int, array{id: int, name: string, email: string}>, assigned_user_ids: array<int>}
     */
    public function userOptions(Post $post): array
    {
        return $this->getPostUserOptionsAction->execute($post);
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

    /**
     * @return EloquentCollection<int, Post>
     */
    public function getLatestPosts(int $limit): EloquentCollection
    {
        return $this->getLatestPostsAction->execute($limit);
    }
}

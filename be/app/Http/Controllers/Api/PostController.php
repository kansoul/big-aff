<?php

namespace App\Http\Controllers\Api;

use App\Enums\Permission;
use App\Http\Requests\Post\GetLatestPostsRequest;
use App\Http\Requests\Post\GetPostBySlugRequest;
use App\Http\Requests\Post\ListPostsRequest;
use App\Http\Requests\Post\PublishPostRequest;
use App\Http\Requests\Post\SearchPostRequest;
use App\Http\Requests\Post\StorePostRequest;
use App\Http\Requests\Post\UpdatePostRequest;
use App\Http\Resources\Post\LatestPostResource;
use App\Http\Resources\Post\PostBySlugResource;
use App\Http\Resources\Post\PostResource;
use App\Models\Post;
use App\Models\User;
use App\Services\Post\PostService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags Posts
 */
class PostController extends BaseController
{
    public function __construct(
        private readonly PostService $postService
    ) {}

    /**
     * List posts
     *
     * Return paginated list of posts.
     *
     * @queryParam query string Search by title or slug. Example: hello
     * @queryParam status string Filter by status. Enum: draft, published, trash. Example: published
     * @queryParam type string Filter by type. Enum: normal, ai, wordpress. Example: normal
     * @queryParam lang string Filter by language. Example: vi
     * @queryParam category_id integer Filter by category. Example: 1
     * @queryParam deleted_at string Include soft-deleted posts. Enum: with, only, without. Example: with
     * @queryParam is_hidden integer Filter by hidden status. Enum: 0, 1. Example: 0
     * @queryParam created_by integer Filter by creator user ID. Example: 1
     * @queryParam created_at_from string Filter posts created on or after this date (Y-m-d). Example: 2026-01-01
     * @queryParam created_at_to string Filter posts created on or before this date (Y-m-d). Example: 2026-12-31
     * @queryParam order_by string Column to sort by. Enum: id, title, slug, status, type, lang, published_at, created_at. Example: created_at
     * @queryParam order string Sort direction. Enum: asc, desc. Example: desc
     * @queryParam per_page integer Items per page (max 100). Example: 15
     * @queryParam page integer Page number. Example: 1
     *
     * @response 200 {"data": [{"id": 1, "title": "My Post", "slug": "my-post", "lang": "vi", "note": null, "description": "A short description", "content": "<p>Post content</p>", "feature_media_id": null, "feature_media": null, "status": "draft", "is_hidden": false, "type": "normal", "category_id": null, "category": null, "created_by": 1, "updated_by": null, "published_at": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}], "pagination": {"total": 1, "per_page": 15, "current_page": 1, "last_page": 1}}
     */
    public function index(ListPostsRequest $request): JsonResponse
    {
        $paginator = $this->postService->list($request->validated());

        return $this->sendResponse([
            'data' => PostResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Create post
     *
     * Create a new post.
     *
     * @bodyParam title string required Post title (max 255). Example: My Post
     * @bodyParam slug string required URL slug (must be unique, max 255). Example: my-post
     * @bodyParam lang string optional Language code (max 10). Example: vi
     * @bodyParam note string optional Short note (max 255). Example: Internal note
     * @bodyParam description string optional Short description. Example: A short description
     * @bodyParam content string optional Full HTML content. Example: <p>Post content</p>
     * @bodyParam feature_media_id integer optional ID of the feature media file. Example: 1
     * @bodyParam status string optional Post status. Enum: draft, published, trash. Example: draft
     * @bodyParam is_hidden boolean optional Whether the post is hidden. Example: false
     * @bodyParam type string optional Post type. Enum: normal, ai, wordpress. Example: normal
     * @bodyParam category_id integer optional ID of the category. Example: 1
     * @bodyParam published_at string optional Publish date (ISO 8601). Example: 2026-01-01T00:00:00Z
     * @bodyParam keyword_set_ids integer[] optional Array of keyword set IDs to attach. Example: [1, 2]
     *
     * @response 201 {"data": {"id": 1, "title": "My Post", "slug": "my-post", "lang": "vi", "note": null, "description": "A short description", "content": "<p>Post content</p>", "feature_media_id": null, "feature_media": null, "status": "draft", "is_hidden": false, "type": "normal", "category_id": null, "category": null, "created_by": 1, "updated_by": null, "published_at": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}}
     * @response 422 {"message": "The title field is required.", "errors": {"title": ["The title field is required."]}}
     */
    public function store(StorePostRequest $request): JsonResponse
    {
        $data = $request->validated();

        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermissionFlag(Permission::PostsPublish)) {
            $data['status'] = 'draft';
            $data['published_at'] = null;
        }

        $post = $this->postService->create($data);
        $post->load(['featureMedia', 'category']);

        return $this->sendResponse(
            ['data' => new PostResource($post)],
            Response::HTTP_CREATED
        );
    }

    /**
     * Show post
     *
     * Return a single post by ID.
     *
     * @urlParam post integer required The post ID. Example: 1
     *
     * @response 200 {"data": {"id": 1, "title": "My Post", "slug": "my-post", "lang": "vi", "note": null, "description": "A short description", "content": "<p>Post content</p>", "feature_media_id": null, "feature_media": null, "status": "draft", "is_hidden": false, "type": "normal", "category_id": null, "category": null, "keyword_sets": {"id": 1, "name": "Set A", "keywords": ["kw1"]}, "created_by": 1, "updated_by": null, "published_at": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}}
     * @response 404 {"message": "No query results for model [App\\Models\\Post] 1"}
     */
    public function show(Post $post): JsonResponse
    {
        $post->load(['featureMedia', 'category', 'keywordSets']);

        return $this->sendResponse(
            ['data' => new PostResource($post)]
        );
    }

    /**
     * Update post
     *
     * Update an existing post (partial update supported).
     *
     * @urlParam post integer required The post ID. Example: 1
     *
     * @bodyParam title string optional Post title (max 255). Example: Updated Post
     * @bodyParam slug string optional URL slug (must be unique, max 255). Example: updated-post
     * @bodyParam lang string optional Language code (max 10). Example: vi
     * @bodyParam note string optional Short note (max 255). Example: Updated note
     * @bodyParam description string optional Short description. Example: Updated description
     * @bodyParam content string optional Full HTML content. Example: <p>Updated content</p>
     * @bodyParam feature_media_id integer optional ID of the feature media file. Pass null to remove. Example: 1
     * @bodyParam status string optional Post status. Enum: draft, published, trash. Example: published
     * @bodyParam is_hidden boolean optional Whether the post is hidden. Example: false
     * @bodyParam type string optional Post type. Enum: normal, ai, wordpress. Example: normal
     * @bodyParam category_id integer optional ID of the category. Example: 1
     * @bodyParam published_at string optional Publish date (ISO 8601). Example: 2026-06-01T00:00:00Z
     * @bodyParam keyword_set_ids integer[] optional Array of keyword set IDs to sync. Pass null or omit to keep existing. Example: [1, 2]
     *
     * @response 200 {"data": {"id": 1, "title": "Updated Post", "slug": "updated-post", "lang": "vi", "note": "Updated note", "description": "Updated description", "content": "<p>Updated content</p>", "feature_media_id": null, "feature_media": null, "status": "published", "is_hidden": false, "type": "normal", "category_id": null, "category": null, "created_by": 1, "updated_by": 2, "published_at": "2026-06-01T00:00:00+00:00", "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-06-01T00:00:00+00:00"}}
     * @response 403 {"message": "This action is unauthorized."}
     * @response 404 {"message": "No query results for model [App\\Models\\Post] 1"}
     * @response 422 {"message": "The slug has already been taken.", "errors": {"slug": ["The slug has already been taken."]}}
     */
    public function update(UpdatePostRequest $request, Post $post): JsonResponse
    {
        $data = $request->validated();

        /** @var User $user */
        $user = Auth::user();
        if (! $user->hasPermissionFlag(Permission::PostsPublish)) {
            unset($data['status'], $data['published_at']);
        }

        $updated = $this->postService->update($post, $data);

        return $this->sendResponse(
            ['data' => new PostResource($updated)]
        );
    }

    /**
     * Delete post
     *
     * Move a post to trash (sets status to "trash").
     *
     * @urlParam post integer required The post ID. Example: 1
     *
     * @response 204 {}
     * @response 403 {"message": "This action is unauthorized."}
     * @response 404 {"message": "No query results for model [App\\Models\\Post] 1"}
     */
    public function destroy(Post $post): JsonResponse
    {
        $this->postService->delete($post);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }

    /**
     * Publish or unpublish post
     *
     * Toggle a post between published and draft. Pass `publish: true` to publish, `false` to unpublish.
     *
     * @urlParam post integer required The post ID. Example: 1
     *
     * @bodyParam publish boolean required Whether to publish (true) or unpublish (false). Example: true
     *
     * @response 200 {"data": {"id": 1, "status": "published", "published_at": "2026-04-21T00:00:00+00:00"}}
     * @response 403 {"message": "This action is unauthorized."}
     * @response 404 {"message": "No query results for model [App\\Models\\Post] 1"}
     */
    public function publish(Post $post, PublishPostRequest $request): JsonResponse
    {
        $data = $request->validated();

        $updated = $this->postService->update($post, [
            'status' => $data['publish'] ? 'published' : 'draft',
            'published_at' => $data['publish'] ? now()->toDateString() : null,
        ]);

        return $this->sendResponse(['data' => new PostResource($updated)]);
    }

    /**
     * Post options for select inputs
     *
     * Return a flat list of posts with their keyword sets for use in select/dropdown inputs.
     *
     * @response 200 {"data": [{"id": 1, "title": "My Post", "slug": "my-post", "keyword_sets": [{"id": 1, "name": "Set A"}]}]}
     */
    public function options(): JsonResponse
    {
        return $this->sendResponse([
            'data' => $this->postService->options(),
        ]);
    }

    /**
     * Get post by slug
     *
     * @urlParam slug string required The post slug. Example: my-post
     */
    public function getPostBySlug(string $slug, GetPostBySlugRequest $request): JsonResponse
    {
        $post = $this->postService->getPostBySlug($slug, $request->validated());

        if (! $post) {
            return $this->sendError('Post not found', [], Response::HTTP_NOT_FOUND);
        }

        return $this->sendResponse([
            'data' => new PostBySlugResource($post),
        ]);
    }

    /**
     * Search posts
     */
    public function searchPosts(SearchPostRequest $request): JsonResponse
    {
        $results = $this->postService->searchPosts($request->validated());

        return $results->response();
    }

    /**
     * Get latest posts
     *
     * Return the most recent published posts for homepage display.
     *
     * @queryParam limit integer Number of posts to return (1–20, default 10). Example: 10
     *
     * @response 200 {"data": [{"id": 1, "title": "My Post", "slug": "my-post", "description": "Short desc", "feature_media": null, "category": null, "published_at": "2026-01-01T00:00:00+00:00", "created_at": "2026-01-01T00:00:00+00:00"}]}
     */
    public function getLatestPosts(GetLatestPostsRequest $request): JsonResponse
    {
        $limit = (int) ($request->validated('limit') ?? 10);
        $posts = $this->postService->getLatestPosts($limit);

        return $this->sendResponse([
            'data' => LatestPostResource::collection($posts),
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\API\BaseController;
use App\Http\Requests\Post\ListPostsRequest;
use App\Http\Requests\Post\StorePostRequest;
use App\Http\Requests\Post\UpdatePostRequest;
use App\Http\Resources\PostResource;
use App\Models\Post;
use App\Services\Post\PostService;
use Illuminate\Http\JsonResponse;
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
     * @queryParam q string Search by title or slug. Example: hello
     * @queryParam status string Filter by status. Enum: draft, published, archived. Example: published
     * @queryParam type string Filter by type. Example: article
     * @queryParam lang string Filter by language. Example: vi
     * @queryParam category_id integer Filter by category. Example: 1
     * @queryParam per_page integer Items per page (max 100). Example: 15
     * @queryParam page integer Page number. Example: 1
     *
     * @response 200 {"data": [{"id": 1, "title": "My Post", "slug": "my-post", "lang": "vi", "description": "A short description", "content": "<p>Post content</p>", "feature_media_id": null, "feature_media": null, "status": "draft", "is_hidden": false, "type": "article", "category_id": null, "category": null, "created_by": 1, "updated_by": null, "published_at": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}], "pagination": {"total": 1, "per_page": 15, "current_page": 1, "last_page": 1}}
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
     * @bodyParam description string optional Short description. Example: A short description
     * @bodyParam content string optional Full HTML content. Example: <p>Post content</p>
     * @bodyParam feature_media file optional Feature image file (image, max 10MB).
     * @bodyParam status string optional Post status. Enum: draft, published, archived. Example: draft
     * @bodyParam is_hidden boolean optional Whether the post is hidden. Example: false
     * @bodyParam type string optional Post type (max 50). Example: article
     * @bodyParam category_id integer optional ID of the category. Example: 1
     * @bodyParam published_at string optional Publish date (ISO 8601). Example: 2026-01-01T00:00:00Z
     *
     * @response 201 {"data": {"id": 1, "title": "My Post", "slug": "my-post", "lang": "vi", "description": "A short description", "content": "<p>Post content</p>", "feature_media_id": null, "feature_media": null, "status": "draft", "is_hidden": false, "type": "article", "category_id": null, "category": null, "created_by": 1, "updated_by": null, "published_at": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}}
     * @response 422 {"message": "The title field is required.", "errors": {"title": ["The title field is required."]}}
     */
    public function store(StorePostRequest $request): JsonResponse
    {
        $post = $this->postService->create($request->validated());
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
     * @response 200 {"data": {"id": 1, "title": "My Post", "slug": "my-post", "lang": "vi", "description": "A short description", "content": "<p>Post content</p>", "feature_media_id": null, "feature_media": null, "status": "draft", "is_hidden": false, "type": "article", "category_id": null, "category": null, "created_by": 1, "updated_by": null, "published_at": null, "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-01-01T00:00:00+00:00"}}
     * @response 404 {"message": "No query results for model [App\\Models\\Post] 1"}
     */
    public function show(Post $post): JsonResponse
    {
        $post->load(['featureMedia', 'category']);

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
     * @bodyParam description string optional Short description. Example: Updated description
     * @bodyParam content string optional Full HTML content. Example: <p>Updated content</p>
     * @bodyParam feature_media file optional Feature image file (image, max 10MB). Pass null to remove.
     * @bodyParam status string optional Post status. Enum: draft, published, archived. Example: published
     * @bodyParam is_hidden boolean optional Whether the post is hidden. Example: false
     * @bodyParam type string optional Post type (max 50). Example: article
     * @bodyParam category_id integer optional ID of the category. Example: 1
     * @bodyParam published_at string optional Publish date (ISO 8601). Example: 2026-06-01T00:00:00Z
     *
     * @response 200 {"data": {"id": 1, "title": "Updated Post", "slug": "updated-post", "lang": "vi", "description": "Updated description", "content": "<p>Updated content</p>", "feature_media_id": null, "feature_media": null, "status": "published", "is_hidden": false, "type": "article", "category_id": null, "category": null, "created_by": 1, "updated_by": 2, "published_at": "2026-06-01T00:00:00+00:00", "created_at": "2026-01-01T00:00:00+00:00", "updated_at": "2026-06-01T00:00:00+00:00"}}
     * @response 404 {"message": "No query results for model [App\\Models\\Post] 1"}
     * @response 422 {"message": "The slug has already been taken.", "errors": {"slug": ["The slug has already been taken."]}}
     */
    public function update(UpdatePostRequest $request, Post $post): JsonResponse
    {
        $updated = $this->postService->update($post, $request->validated());

        return $this->sendResponse(
            ['data' => new PostResource($updated)]
        );
    }

    /**
     * Delete post
     *
     * Soft-delete a post.
     *
     * @urlParam post integer required The post ID. Example: 1
     *
     * @response 204 {}
     * @response 404 {"message": "No query results for model [App\\Models\\Post] 1"}
     */
    public function destroy(Post $post): JsonResponse
    {
        $this->postService->delete($post);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
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
        $posts = Post::query()
            ->select(['id', 'title', 'slug'])
            ->with(['keywordSets:id,post_id,name'])
            ->whereNull('deleted_at')
            ->orderBy('title')
            ->get();

        return $this->sendResponse([
            'data' => $posts->map(fn (Post $post) => [
                'id' => $post->id,
                'title' => $post->title,
                'slug' => $post->slug,
                'keyword_sets' => $post->keywordSets->map(fn ($ks) => [
                    'id' => $ks->id,
                    'name' => $ks->name,
                ]),
            ]),
        ]);
    }
}

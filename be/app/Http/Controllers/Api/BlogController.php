<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Blog\ListBlogCategoriesRequest;
use App\Http\Requests\Blog\ListBlogPostsRequest;
use App\Http\Resources\Blog\BlogCategoryResource;
use App\Http\Resources\Blog\BlogPostDetailResource;
use App\Http\Resources\Blog\BlogPostIndexResource;
use App\Http\Resources\Blog\BlogPostResource;
use App\Services\Blog\BlogService;
use Illuminate\Http\JsonResponse;

class BlogController extends BaseController
{
    public function __construct(
        private readonly BlogService $service,
    ) {}

    public function listPosts(ListBlogPostsRequest $request): JsonResponse
    {
        $limit = $request->validated('limit', 10);
        $categorySlug = $request->validated('category_slug');
        $paginator = $this->service->listPosts($limit, $categorySlug);

        return $this->sendResponse([
            'data' => BlogPostResource::collection($paginator),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    public function listCategories(ListBlogCategoriesRequest $request): JsonResponse
    {
        $limit = $request->validated('limit', 10);
        $categories = $this->service->listCategories($limit);

        return $this->sendResponse([
            'data' => BlogCategoryResource::collection($categories),
        ]);
    }

    public function indexPosts(): JsonResponse
    {
        $posts = $this->service->indexPosts();

        return $this->sendResponse([
            'data' => BlogPostIndexResource::collection($posts),
        ]);
    }

    public function showPost(int $id): JsonResponse
    {
        $post = $this->service->getPost($id);

        if (! $post) {
            return $this->sendError('Post not found.', [], 404);
        }

        return $this->sendResponse([
            'data' => new BlogPostDetailResource($post),
        ]);
    }
}

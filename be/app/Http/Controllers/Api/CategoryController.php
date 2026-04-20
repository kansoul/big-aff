<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Category\ListCategoriesRequest;
use App\Http\Requests\Category\StoreCategoryRequest;
use App\Http\Requests\Category\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Services\Category\CategoryService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags Categories
 */
class CategoryController extends BaseController
{
    public function __construct(
        private readonly CategoryService $categoryService
    ) {}

    /**
     * List categories
     *
     * Return paginated list of categories.
     *
     * @queryParam query string Search by name or description. Example: news
     * @queryParam per_page integer Items per page (max 100). Example: 15
     * @queryParam page integer Page number. Example: 1
     * @queryParam order_by string Column to sort by (id, name, created_at, updated_at). Example: name
     * @queryParam order string Sort direction (asc, desc). Example: asc
     */
    public function index(ListCategoriesRequest $request): JsonResponse
    {
        $paginator = $this->categoryService->list($request->validated());

        return $this->sendResponse([
            'data' => CategoryResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Create category
     *
     * Create a new category.
     *
     * @bodyParam name string required Category name (max 255). Example: Technology
     * @bodyParam description string optional Category description. Example: Tech news
     */
    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $category = $this->categoryService->create($request->validated());

        return $this->sendResponse(
            ['data' => new CategoryResource($category)],
            Response::HTTP_CREATED
        );
    }

    /**
     * Show category
     *
     * Return a single category by ID.
     *
     * @urlParam category integer required The category ID. Example: 1
     */
    public function show(Category $category): JsonResponse
    {
        return $this->sendResponse(
            ['data' => new CategoryResource($category)]
        );
    }

    /**
     * Update category
     *
     * Update an existing category (partial update supported).
     *
     * @urlParam category integer required The category ID. Example: 1
     *
     * @bodyParam name string optional Category name (max 255). Example: Updated Name
     * @bodyParam description string optional Category description. Example: Updated description
     */
    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        $updated = $this->categoryService->update($category, $request->validated());

        return $this->sendResponse(
            ['data' => new CategoryResource($updated)]
        );
    }

    /**
     * Delete category
     *
     * Soft-delete a category.
     *
     * @urlParam category integer required The category ID. Example: 1
     */
    public function destroy(Category $category): JsonResponse
    {
        $this->categoryService->delete($category);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }
}

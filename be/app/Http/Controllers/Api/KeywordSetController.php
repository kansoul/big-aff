<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\API\BaseController;
use App\Http\Requests\KeywordSet\ListKeywordSetsRequest;
use App\Http\Requests\KeywordSet\StoreKeywordSetRequest;
use App\Http\Requests\KeywordSet\UpdateKeywordSetRequest;
use App\Http\Resources\KeywordSetResource;
use App\Models\KeywordSet;
use App\Services\KeywordSet\KeywordSetService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags Keyword Sets
 */
class KeywordSetController extends BaseController
{
    public function __construct(
        private readonly KeywordSetService $keywordSetService
    ) {}

    /**
     * List keyword sets
     *
     * Return paginated list of keyword sets.
     *
     * @queryParam keyword string Search by name. Example: fashion
     * @queryParam per_page integer Items per page (max 100). Example: 15
     * @queryParam page integer Page number. Example: 1
     * @queryParam order_by string Column to sort by (id, name, created_by, created_at). Example: created_at
     * @queryParam order string Sort direction (asc, desc). Example: desc
     */
    public function index(ListKeywordSetsRequest $request): JsonResponse
    {
        $paginator = $this->keywordSetService->list($request->validated());

        return $this->sendResponse([
            'data' => KeywordSetResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Create keyword set
     *
     * Create a new keyword set.
     *
     * @bodyParam name string required Keyword set name (max 255). Example: Fashion Keywords
     * @bodyParam keywords string[] optional List of keywords. Example: ["dress", "shirt", "shoes"]
     */
    public function store(StoreKeywordSetRequest $request): JsonResponse
    {
        $keywordSet = $this->keywordSetService->create($request->validated());

        return $this->sendResponse(
            ['data' => new KeywordSetResource($keywordSet)],
            Response::HTTP_CREATED
        );
    }

    /**
     * Update keyword set
     *
     * Update an existing keyword set (partial update supported).
     *
     * @urlParam keyword_set integer required The keyword set ID. Example: 1
     *
     * @bodyParam name string optional Keyword set name (max 255). Example: Updated Name
     * @bodyParam keywords string[] optional List of keywords. Example: ["bag", "wallet"]
     */
    public function update(UpdateKeywordSetRequest $request, KeywordSet $keywordSet): JsonResponse
    {
        $updated = $this->keywordSetService->update($keywordSet, $request->validated());

        return $this->sendResponse(['data' => new KeywordSetResource($updated)]);
    }

    /**
     * Delete keyword set
     *
     * Soft-delete a keyword set.
     *
     * @urlParam keyword_set integer required The keyword set ID. Example: 1
     */
    public function destroy(KeywordSet $keywordSet): JsonResponse
    {
        $this->keywordSetService->delete($keywordSet);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }
}

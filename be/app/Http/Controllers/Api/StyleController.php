<?php

namespace App\Http\Controllers\Api;


use App\Http\Requests\Style\BulkStoreStyleRequest;
use App\Http\Requests\Style\ListStylesRequest;
use App\Http\Resources\StyleResource;
use App\Models\Style;
use App\Services\Style\StyleService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags Styles
 */
class StyleController extends BaseController
{
    public function __construct(
        private readonly StyleService $styleService
    ) {}

    /**
     * List styles
     */
    public function index(ListStylesRequest $request): JsonResponse
    {
        $paginator = $this->styleService->list($request->validated(), $request->user());

        return $this->sendResponse([
            'data' => StyleResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Bulk create styles
     */
    public function store(BulkStoreStyleRequest $request): JsonResponse
    {
        $result = $this->styleService->bulkCreate($request->validated());

        return $this->sendResponse(
            [
                'data' => StyleResource::collection($result['created']),
                'errors' => $result['errors'],
            ],
            Response::HTTP_CREATED
        );
    }

    /**
     * Delete a style
     */
    public function destroy(Style $style): JsonResponse
    {
        $this->authorize('delete', $style);

        $this->styleService->delete($style);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }

    /**
     * Style options for select inputs
     */
    public function options(): JsonResponse
    {
        $styles = Style::query()
            ->select(['id', 'code', 'name'])
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get();

        return $this->sendResponse([
            'data' => $styles->map(fn(Style $style) => [
                'code' => $style->code,
                'name' => $style->name,
            ]),
        ]);
    }
}

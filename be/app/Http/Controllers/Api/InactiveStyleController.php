<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\InactiveStyle\BulkClearInactiveStylesRequest;
use App\Http\Requests\InactiveStyle\ListInactiveStylesRequest;
use App\Http\Resources\InactiveStyleResource;
use App\Models\User;
use App\Services\InactiveStyle\InactiveStyleService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * @tags Inactive Styles
 */
class InactiveStyleController extends BaseController
{
    public function __construct(
        private readonly InactiveStyleService $inactiveStyleService,
    ) {}

    /**
     * List inactive style assignments
     *
     * Returns a paginated list of users whose assigned style has not been updated
     * and has received no revenue in the last 2 months.
     *
     * @queryParam manager_id integer Filter by manager (returns their direct child users). Example: 5
     * @queryParam query string Search by style code, style name, user name, or email. Example: ABC
     * @queryParam order_by string Column to sort by. Enum: style_code, style_name, user_name, user_email, style_updated_at, last_revenue_date. Example: style_updated_at
     * @queryParam order string Sort direction. Enum: asc, desc. Example: asc
     * @queryParam per_page integer Items per page (max 100). Example: 25
     * @queryParam page integer Page number. Example: 1
     *
     * @response 200 {"data": [{"user_id": 12, "style_id": 3, "style_code": "ABC123", "style_name": "My Style", "style_updated_at": "2026-01-01T00:00:00+00:00", "user_name": "John Doe", "user_email": "john@example.com", "last_revenue_date": "2026-01-15"}], "pagination": {"total": 1, "per_page": 25, "current_page": 1, "last_page": 1}}
     */
    public function index(ListInactiveStylesRequest $request): JsonResponse
    {
        $paginator = $this->inactiveStyleService->list($request->validated());

        return $this->sendResponse([
            'data' => InactiveStyleResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Remove style assignment from a user
     *
     * Clears the style assignment (sets style_id to null) for the given user.
     *
     * @urlParam user integer required The user ID. Example: 12
     *
     * @response 204 {}
     */
    public function destroy(User $user): JsonResponse
    {
        $this->inactiveStyleService->clear($user);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }

    /**
     * Bulk clear inactive style assignments
     *
     * Removes style assignments for all users matching the current filters.
     * Returns the count of cleared records.
     *
     * @bodyParam manager_id integer Filter by manager (clears only their direct child users). Example: 5
     *
     * @response 200 {"data": {"cleared_count": 42}}
     */
    public function bulkDestroy(BulkClearInactiveStylesRequest $request): JsonResponse
    {
        $count = $this->inactiveStyleService->bulkClear($request->validated());

        return $this->sendResponse([
            'data' => ['cleared_count' => $count],
        ]);
    }
}

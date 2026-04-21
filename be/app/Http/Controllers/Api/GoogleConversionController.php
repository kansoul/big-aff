<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\GoogleConversion\BulkUpdateGoogleConversionsRequest;
use App\Http\Requests\GoogleConversion\ImportGoogleConversionsRequest;
use App\Http\Requests\GoogleConversion\ListGoogleConversionsRequest;
use App\Http\Requests\GoogleConversion\UpdateGoogleConversionRequest;
use App\Http\Resources\GoogleConversionResource;
use App\Models\Account;
use App\Services\GoogleConversion\GoogleConversionService;
use Illuminate\Http\JsonResponse;

/**
 * @tags Google Conversions
 */
class GoogleConversionController extends BaseController
{
    public function __construct(
        private readonly GoogleConversionService $googleConversionService
    ) {}

    /**
     * List Google conversions
     *
     * Return paginated list of Google accounts with their conversion data.
     *
     * @queryParam query string Search by account_id or account_name. Example: acc-123
     * @queryParam order_by string Column to sort by. Enum: id, account_id, account_name, created_at. Example: account_name
     * @queryParam order string Sort direction. Enum: asc, desc. Example: asc
     * @queryParam per_page integer Items per page (max 100). Example: 15
     * @queryParam page integer Page number. Example: 1
     *
     * @response 200 {"data": [{"id": 1, "account_id": "706-350-4758", "account_name": "My Google Account", "conversion": {"article_view": "111", "rsu_click": "222", "search_view": "333", "search_click": "444"}}], "pagination": {"total": 1, "per_page": 15, "current_page": 1, "last_page": 1}}
     */
    public function index(ListGoogleConversionsRequest $request): JsonResponse
    {
        $paginator = $this->googleConversionService->list($request->validated());

        return $this->sendResponse([
            'data' => GoogleConversionResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Update Google conversion
     *
     * Update conversion data for a single Google account.
     *
     * @urlParam account integer required The account ID. Example: 1
     *
     * @bodyParam article_view string optional Article view conversion ID. Example: 7530496784
     * @bodyParam rsu_click string optional RSU click conversion ID. Example: 7530496785
     * @bodyParam search_view string optional Search view conversion ID. Example: 7530496786
     * @bodyParam search_click string optional Search click conversion ID. Example: 7530496787
     *
     * @response 200 {"data": {"id": 1, "account_id": "706-350-4758", "account_name": "My Google Account", "conversion": {"article_view": "7530496784", "rsu_click": "7530496785", "search_view": "7530496786", "search_click": "7530496787"}}}
     * @response 403 {"message": "This action is unauthorized."}
     * @response 404 {"message": "No query results for model [App\\Models\\Account] 1"}
     */
    public function update(UpdateGoogleConversionRequest $request, Account $account): JsonResponse
    {
        $updated = $this->googleConversionService->update($account, $request->validated());

        return $this->sendResponse(['data' => new GoogleConversionResource($updated)]);
    }

    /**
     * Bulk update Google conversions
     *
     * Update conversion data for multiple Google accounts at once.
     *
     * @bodyParam rows array required Array of conversion rows.
     * @bodyParam rows[].account_id integer required The account ID. Example: 1
     * @bodyParam rows[].article_view string optional Article view conversion ID. Example: 7530496784
     * @bodyParam rows[].rsu_click string optional RSU click conversion ID. Example: 7530496785
     * @bodyParam rows[].search_view string optional Search view conversion ID. Example: 7530496786
     * @bodyParam rows[].search_click string optional Search click conversion ID. Example: 7530496787
     *
     * @response 200 {"data": {"message": "Conversions saved successfully"}}
     */
    public function bulkUpdate(BulkUpdateGoogleConversionsRequest $request): JsonResponse
    {
        $this->googleConversionService->bulkUpdate($request->validated()['rows']);

        return $this->sendResponse(['data' => ['message' => 'Conversions saved successfully']]);
    }

    /**
     * Import Google conversions (bulk)
     *
     * Parse and import conversion data from pipe-delimited text.
     * Each line format: `Customer ID|Conversion Name|Conversion ID`
     * Supported conversion names: OutboundClickU, ArticleViewU, SearchViewU, RSUClickU
     *
     * @bodyParam data string required Pipe-delimited conversion data. Example: "706-350-4758|OutboundClickU|7530496784\n706-350-4758|ArticleViewU|7530496785"
     *
     * @response 200 {"data": {"processed": 2, "skipped": 0}}
     */
    public function import(ImportGoogleConversionsRequest $request): JsonResponse
    {
        $result = $this->googleConversionService->import($request->validated()['lines']);

        return $this->sendResponse(['data' => $result]);
    }
}

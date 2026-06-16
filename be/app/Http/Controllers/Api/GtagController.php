<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Gtag\BulkUpdateGtagsRequest;
use App\Http\Requests\Gtag\ImportGtagsRequest;
use App\Http\Requests\Gtag\ListGtagsRequest;
use App\Http\Requests\Gtag\UpdateGtagRequest;
use App\Http\Resources\GtagResource;
use App\Models\Account;
use App\Services\Gtag\GtagService;
use Illuminate\Http\JsonResponse;

/**
 * @tags Gtags
 */
class GtagController extends BaseController
{
    public function __construct(
        private readonly GtagService $gtagService
    ) {}

    public function index(ListGtagsRequest $request): JsonResponse
    {
        $paginator = $this->gtagService->list($request->validated());

        return $this->sendResponse([
            'data' => GtagResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    public function update(UpdateGtagRequest $request, Account $account): JsonResponse
    {
        $updated = $this->gtagService->update($account, $request->validated());

        return $this->sendResponse(['data' => new GtagResource($updated)]);
    }

    public function bulkUpdate(BulkUpdateGtagsRequest $request): JsonResponse
    {
        $this->gtagService->bulkUpdate($request->validated()['rows']);

        return $this->sendResponse(['data' => ['message' => 'Gtags saved successfully']]);
    }

    public function import(ImportGtagsRequest $request): JsonResponse
    {
        $result = $this->gtagService->import($request->validated()['lines']);

        return $this->sendResponse(['data' => $result]);
    }
}

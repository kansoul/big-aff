<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Adx\Report\ListAdxReportsRequest;
use App\Http\Resources\Adx\AdxConversionResource;
use App\Http\Resources\Adx\AdxReportResource;
use App\Services\Adx\AdxReportService;
use Illuminate\Http\JsonResponse;

/**
 * @tags AdX Reports
 */
class AdxReportController extends BaseController
{
    public function __construct(
        private readonly AdxReportService $service,
    ) {}

    public function spend(ListAdxReportsRequest $request): JsonResponse
    {
        $paginator = $this->service->spend($request->validated());

        return $this->paginatedReport($paginator);
    }

    public function campaigns(ListAdxReportsRequest $request): JsonResponse
    {
        $paginator = $this->service->campaigns($request->validated());

        return $this->paginatedReport($paginator);
    }

    public function revenue(ListAdxReportsRequest $request): JsonResponse
    {
        $paginator = $this->service->revenue($request->validated());

        return $this->paginatedReport($paginator);
    }

    public function realtime(ListAdxReportsRequest $request): JsonResponse
    {
        $paginator = $this->service->realtime($request->validated());

        return $this->paginatedReport($paginator);
    }

    public function conversions(ListAdxReportsRequest $request): JsonResponse
    {
        $paginator = $this->service->conversions($request->validated());

        return $this->sendResponse([
            'data' => AdxConversionResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    private function paginatedReport($paginator): JsonResponse
    {
        return $this->sendResponse([
            'data' => AdxReportResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }
}

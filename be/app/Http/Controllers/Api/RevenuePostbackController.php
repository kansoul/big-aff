<?php

namespace App\Http\Controllers\Api;

use App\Actions\RevenuePostback\StoreRevenuePostbackAction;
use App\Http\Requests\RevenuePostback\StoreRevenuePostbackRequest;
use Illuminate\Http\JsonResponse;

class RevenuePostbackController extends BaseController
{
    public function __invoke(
        StoreRevenuePostbackRequest $request,
        StoreRevenuePostbackAction $action,
    ): JsonResponse {
        $report = $action->execute($request->validated());

        return $this->sendResponse([
            'session_id' => $report->session_id,
            'revenue' => (float) $report->revenue,
            'revenue_received_at' => $report->revenue_received_at,
        ]);
    }
}

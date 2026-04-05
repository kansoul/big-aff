<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;

class BaseController extends Controller
{
    /**
     * Return a standardized successful JSON response.
     */
    protected function sendResponse(mixed $data, int $code = 200): JsonResponse
    {
        return response()->json($data, $code);
    }

    /**
     * Parse pagination for resources
     *
     * @param LengthAwarePaginator $dataPagination
     *
     * @return array
     */
    protected function parsePagination(LengthAwarePaginator $dataPagination): array
    {
        return [
            'current_page' => $dataPagination->currentPage(),
            'from' => $dataPagination->firstItem(),
            'to' => $dataPagination->lastItem(),
            'last_page' => $dataPagination->lastPage(),
            'last_page_url' => $dataPagination->url($dataPagination->lastPage()),
            'next_page_url' => $dataPagination->nextPageUrl(),
            'path' => $dataPagination->path(),
            'per_page' => $dataPagination->perPage(),
            'prev_page_url' => $dataPagination->previousPageUrl(),
            'total' => $dataPagination->total(),
        ];
    }

    /**
     * Return a standardized error JSON response.
     *
     * @param  array<int, string>  $errorMessages
     */
    protected function sendError(string $error, array $errorMessages = [], int $code = 404): JsonResponse
    {
        $response = [
            'success' => false,
            'message' => $error,
            'data' => null,
        ];

        if (! empty($errorMessages)) {
            $response['errors'] = $errorMessages;
        }

        return response()->json($response, $code);
    }
}

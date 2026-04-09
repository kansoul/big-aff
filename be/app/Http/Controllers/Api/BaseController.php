<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Contracts\Pagination\Paginator;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;

class BaseController extends Controller
{
    use AuthorizesRequests;

    /**
     * Return a standardized successful JSON response.
     */
    protected function sendResponse(mixed $data, int $code = 200): JsonResponse
    {
        return response()->json($data, $code);
    }

    /**
     * Parse pagination for resources
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
     * Pagination metadata for simple paginator (no total / last page).
     */
    protected function parseSimplePagination(Paginator $paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'has_more_pages' => $paginator->hasMorePages(),
            'next_page_url' => $paginator->nextPageUrl(),
            'prev_page_url' => $paginator->previousPageUrl(),
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

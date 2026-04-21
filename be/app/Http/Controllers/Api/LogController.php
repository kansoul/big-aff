<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Log\ListLogEntriesRequest;
use App\Http\Requests\Log\TailLogRequest;
use App\Services\Log\LogService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class LogController extends BaseController
{
    public function __construct(
        private readonly LogService $logService,
    ) {}

    /**
     * List available log files.
     */
    public function files(): JsonResponse
    {
        return $this->sendResponse([
            'data' => $this->logService->files(),
        ]);
    }

    /**
     * List log entries with pagination and optional filters.
     *
     * @queryParam file string Log filename (e.g. laravel.log or laravel-2024-01-15.log). Default: laravel.log
     * @queryParam level string Filter by level. Enum: emergency,alert,critical,error,warning,notice,info,debug
     * @queryParam keyword string Search in message and stack trace.
     * @queryParam page integer Page number. Default: 1
     * @queryParam per_page integer Items per page (max 200). Default: 50
     */
    public function index(ListLogEntriesRequest $request): JsonResponse
    {
        $result = $this->logService->list($request->validated());

        return $this->sendResponse($result);
    }

    /**
     * Tail the most recent log entries.
     *
     * @queryParam file string Log filename. Default: laravel.log
     * @queryParam limit integer Number of entries to return (max 500). Default: 100
     */
    public function tail(TailLogRequest $request): JsonResponse
    {
        return $this->sendResponse([
            'data' => $this->logService->tail($request->validated()),
        ]);
    }

    /**
     * Fetch a single log entry by its encoded ID.
     *
     * @urlParam id string required URL-safe base64 entry identifier.
     */
    public function show(string $id): JsonResponse
    {
        $entry = $this->logService->find($id);

        if ($entry === null) {
            return $this->sendError('Log entry not found.', [], Response::HTTP_NOT_FOUND);
        }

        return $this->sendResponse(['data' => $entry]);
    }
}

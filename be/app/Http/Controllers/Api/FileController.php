<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\API\BaseController;
use App\Http\Requests\File\ListFilesRequest;
use App\Http\Requests\File\StoreFileRequest;
use App\Http\Resources\FileResource;
use App\Models\File;
use App\Services\File\FileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class FileController extends BaseController
{
    public function __construct(
        private readonly FileService $fileService
    ) {}

    /**
     * List file records; filters are limited to user_id and created_at range only.
     */
    public function index(ListFilesRequest $request): JsonResponse
    {
        $payload = $request->validated();
        $paginator = $this->fileService->listFiles($payload);

        return $this->sendResponse([
            'data' => FileResource::collection($paginator->items()),
            'pagination' => $this->parsePagination($paginator),
        ]);
    }

    /**
     * Upload a new file.
     */
    public function store(StoreFileRequest $request): JsonResponse
    {
        $file = $this->fileService->create($request->validated());

        return $this->sendResponse(
            [
                'data' => new FileResource($file),
            ]
        );
    }

    /**
     * Show a single file.
     */
    public function show(File $file): JsonResponse
    {
        return $this->sendResponse(
            [
                'data' => new FileResource($file),
            ]
        );
    }

    /**
     * Delete a file.
     */
    public function destroy(File $file): JsonResponse
    {
        $this->fileService->delete($file);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }
}

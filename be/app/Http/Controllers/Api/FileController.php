<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\File\ListFilesRequest;
use App\Http\Requests\File\OptionsFileRequest;
use App\Http\Requests\File\StoreFileRequest;
use App\Http\Resources\FileResource;
use App\Models\File;
use App\Services\File\FileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * @tags Files
 */
class FileController extends BaseController
{
    public function __construct(
        private readonly FileService $fileService
    ) {}

    /**
     * List files
     *
     * Return paginated file records. Filters: user_id, created_from, created_to.
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
     * Upload file
     *
     * Upload a new file to the specified disk and directory.
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
     * Show file
     *
     * Return a single file record by ID.
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
     * Delete file
     *
     * Remove a file record and its storage object.
     */
    public function destroy(File $file): JsonResponse
    {
        $this->fileService->delete($file);

        return $this->sendResponse([], Response::HTTP_NO_CONTENT);
    }

    /**
     * Get file options
     *
     * Return a list of available directories for file uploads.
     */
    public function options(OptionsFileRequest $request): JsonResponse
    {
        $options = $this->fileService->getOptions($request->validated());

        return $this->sendResponse([
            'data' => FileResource::collection($options),
        ]);
    }
}

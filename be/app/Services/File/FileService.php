<?php

namespace App\Services\File;

use App\Actions\File\DeleteFileAction;
use App\Actions\File\ListFilesAction;
use App\Actions\File\StoreFileAction;
use App\Models\File;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;

class FileService
{
    public function __construct(
        private readonly StoreFileAction $storeFileAction,
        private readonly DeleteFileAction $deleteFileAction,
        private readonly ListFilesAction $listFilesAction
    ) {}

    /**
     * @param  array{file: UploadedFile, disk?: string|null, alt_text?: string|null}  $data
     */
    public function create(array $data): File
    {
        return $this->storeFileAction->execute($data);
    }

    public function delete(File $file): void
    {
        $this->deleteFileAction->execute($file);
    }

    /**
     * @param  array{user_id?: int|null, created_from?: string|null, created_to?: string|null, per_page?: int|null, page?: int|null, order_by?: string|null, order?: string|null}  $payload
     */
    public function listFiles(array $payload): LengthAwarePaginator
    {
        return $this->listFilesAction->execute($payload);
    }
}

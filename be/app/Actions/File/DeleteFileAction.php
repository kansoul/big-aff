<?php

namespace App\Actions\File;

use App\Models\File;
use App\Services\Storage\StorageServiceInterface;

class DeleteFileAction
{
    public function __construct(
        private readonly StorageServiceInterface $storageService
    ) {}

    public function execute(File $file): void
    {
        $this->storageService->delete($file->disk, $file->path);

        $file->delete();
    }
}

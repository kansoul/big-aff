<?php

namespace App\Actions\File;

use App\Models\File;
use App\Services\Storage\StorageServiceInterface;
use App\Support\OwnershipFilter\OwnershipFilter;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteFileAction
{
    public function __construct(
        private readonly StorageServiceInterface $storageService
    ) {}

    /**
     * @throws AuthorizationException
     */
    public function execute(File $file): void
    {
        // File uses `user_id` (not `created_by`) as the owner column.
        OwnershipFilter::forAuthUser()->authorize($file->user_id);

        $this->storageService->delete($file->disk, $file->path);

        $file->delete();
    }
}

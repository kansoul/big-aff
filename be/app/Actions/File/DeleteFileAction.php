<?php

namespace App\Actions\File;

use App\Models\File;
use App\Support\OwnerResource\FileResource;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteFileAction
{
    /**
     * @throws AuthorizationException
     */
    public function execute(File $file): void
    {
        (new FileResource)->authorize($file);

        $file->delete();
    }
}

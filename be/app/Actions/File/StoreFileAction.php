<?php

namespace App\Actions\File;

use App\Models\File;
use App\Models\User;
use App\Services\Storage\StorageServiceInterface;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class StoreFileAction
{
    public function __construct(
        private readonly StorageServiceInterface $storageService
    ) {}

    /**
     * @param  array{file: UploadedFile, disk?: string|null, directory?: string|null, alt_text?: string|null}  $data
     */
    public function execute(array $data): File
    {
        /** @var User $user */
        $user = Auth::user();
        /** @var UploadedFile $uploadedFile */
        $uploadedFile = $data['file'];

        $directory = $user->isAdmin && isset($data['directory']) ? $data['directory'] : config('filesystems.uploads.directories.posts');
        $extension = $uploadedFile->getClientOriginalExtension();
        $fileName = Str::uuid().'.'.$extension;

        $path = $this->storageService->store($uploadedFile, $directory, $fileName);

        return File::query()->create([
            'user_id' => $user->id,
            'disk' => StorageServiceInterface::PUBLIC_DISK,
            'file_name' => $fileName,
            'original_name' => $uploadedFile->getClientOriginalName(),
            'mime_type' => $uploadedFile->getMimeType() ?? $uploadedFile->getClientMimeType(),
            'size' => $uploadedFile->getSize(),
            'path' => $path,
            'alt_text' => $data['alt_text'] ?? null,
        ]);
    }
}

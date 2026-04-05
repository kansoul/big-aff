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

        $disk = $this->resolveDisk($data['disk'] ?? null);
        $directory = $this->resolveDirectory($data['directory'] ?? null);
        $extension = $uploadedFile->getClientOriginalExtension();
        $fileName = Str::uuid() . '.' . $extension;

        $path = $this->storageService->store($uploadedFile, $directory, $fileName, $disk);

        return File::query()->create([
            'user_id' => $user->id,
            'disk' => $disk,
            'file_name' => $fileName,
            'original_name' => $uploadedFile->getClientOriginalName(),
            'mime_type' => $uploadedFile->getMimeType() ?? $uploadedFile->getClientMimeType(),
            'size' => $uploadedFile->getSize(),
            'path' => $path,
            'alt_text' => $data['alt_text'] ?? null,
        ]);
    }

    private function resolveDisk(?string $requested): string
    {
        if ($requested !== null && $requested !== '') {
            return $requested;
        }

        return config('filesystems.uploads.default', 'public');
    }

    private function resolveDirectory(?string $requested): string
    {
        if ($requested !== null && $requested !== '') {
            return trim($requested, '/');
        }

        return 'uploads/' . now()->format('Y/m');
    }
}

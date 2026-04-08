<?php

namespace App\Services\File;

use App\Actions\File\DeleteFileAction;
use App\Actions\File\ListFilesAction;
use App\Actions\File\OptionsFileAction;
use App\Actions\File\StoreFileAction;
use App\Models\File;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class FileService
{
    public function __construct(
        private readonly StoreFileAction $storeFileAction,
        private readonly DeleteFileAction $deleteFileAction,
        private readonly ListFilesAction $listFilesAction,
        private readonly OptionsFileAction $optionsFileAction,
    ) {}

    /**
     * @param  array{file: UploadedFile, disk?: string|null, directory?: string|null, alt_text?: string|null}  $data
     */
    public function create(array $data): File
    {
        $user = Auth::user();
        $data['directory'] = $this->resolveCreateDirectory($user, $data['directory'] ?? null);

        return $this->storeFileAction->execute($data);
    }

    public function delete(File $file): void
    {
        $this->deleteFileAction->execute($file);
    }

    /**
     * @param  array{user_id?: int|null, created_from?: string|null, created_to?: string|null, per_page?: int|null, page?: int|null, order_by?: string|null, order?: string|null, directory_prefix?: string|null}  $payload
     */
    public function listFiles(array $payload): LengthAwarePaginator
    {
        return $this->listFilesAction->execute($payload);
    }

    public function canViewFile(File $file): bool
    {
        $user = Auth::user();

        if ($user->is_full_access) {
            return true;
        }

        $path = ltrim($file->path, '/');

        return $path === config('filesystems.uploads.directories.posts') || str_starts_with($path, config('filesystems.uploads.directories.posts').'/');
    }

    private function resolveCreateDirectory(User $user, ?string $requestedDirectory): string
    {
        if (! $user->is_full_access) {
            return config('filesystems.uploads.directories.posts');
        }

        $normalized = trim((string) $requestedDirectory, '/');
        if ($normalized === '') {
            return config('filesystems.uploads.directories.posts');
        }

        if (! in_array($normalized, array_values(config('filesystems.uploads.directories')), true)) {
            throw ValidationException::withMessages([
                'directory' => ['Directory must be one of: '.implode(', ', array_values(config('filesystems.uploads.directories')))],
            ]);
        }

        return $normalized;
    }

    /**
     * Get a list of available directories for file uploads.
     *
     * @return array<int, string>
     */
    public function getOptions(array $data): Collection
    {
        return $this->optionsFileAction->execute($data);
    }
}

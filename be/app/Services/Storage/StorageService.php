<?php

namespace App\Services\Storage;

use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use League\Flysystem\FileAttributes;
use League\Flysystem\StorageAttributes;

class StorageService implements StorageServiceInterface
{
    public function store(UploadedFile $file, string $directory, string $fileName, string $disk): string
    {
        return $file->storeAs($directory, $fileName, $disk);
    }

    public function delete(string $disk, string $path): void
    {
        $this->disk($disk)->delete($path);
    }

    public function url(string $disk, string $path): string
    {
        return $this->disk($disk)->url($path);
    }

    public function exists(string $disk, string $path): bool
    {
        return $this->disk($disk)->exists($path);
    }

    public function size(string $disk, string $path): int
    {
        return $this->disk($disk)->size($path);
    }

    public function mimeType(string $disk, string $path): ?string
    {
        return $this->disk($disk)->mimeType($path) ?: null;
    }

    public function temporaryUrl(string $disk, string $path, \DateTimeInterface $expiration): string
    {
        return $this->disk($disk)->temporaryUrl($path, $expiration);
    }

    /**
     * @return array{items: list<array{path: string, size: int|null, last_modified: int|null, mime_type: string|null, url: string}>, truncated: bool}
     */
    public function listObjects(string $disk, string $prefix = '', bool $recursive = false, int $limit = 100): array
    {
        $adapter = $this->disk($disk);
        $listing = $adapter->getDriver()->listContents($prefix === '' ? '' : $prefix, $recursive);

        $items = [];
        $truncated = false;

        foreach ($listing as $attributes) {
            if (! $attributes instanceof StorageAttributes || ! $attributes->isFile()) {
                continue;
            }

            if (count($items) >= $limit) {
                $truncated = true;
                break;
            }

            $path = $attributes->path();
            $fileAttributes = $attributes instanceof FileAttributes ? $attributes : null;

            $items[] = [
                'path' => $path,
                'size' => $fileAttributes?->fileSize(),
                'last_modified' => $attributes->lastModified(),
                'mime_type' => $fileAttributes?->mimeType(),
                'url' => $adapter->url($path),
            ];
        }

        return [
            'items' => $items,
            'truncated' => $truncated,
        ];
    }

    private function disk(string $disk): FilesystemAdapter
    {
        /** @var FilesystemAdapter */
        return Storage::disk($disk);
    }
}

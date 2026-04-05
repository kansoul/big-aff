<?php

namespace App\Services\Storage;

use Illuminate\Http\UploadedFile;

interface StorageServiceInterface
{
    public function store(UploadedFile $file, string $directory, string $fileName, string $disk): string;

    public function delete(string $disk, string $path): void;

    public function url(string $disk, string $path): string;

    public function exists(string $disk, string $path): bool;

    public function size(string $disk, string $path): int;

    public function mimeType(string $disk, string $path): ?string;

    /**
     * @param  array{expiration?: \DateTimeInterface}  $options
     */
    public function temporaryUrl(string $disk, string $path, \DateTimeInterface $expiration): string;

    /**
     * @return array{items: list<array{path: string, size: int|null, last_modified: int|null, mime_type: string|null, url: string}>, truncated: bool}
     */
    public function listObjects(string $disk, string $prefix = '', bool $recursive = false, int $limit = 100): array;
}

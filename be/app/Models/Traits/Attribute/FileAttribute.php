<?php

namespace App\Models\Traits\Attribute;

use App\Services\Storage\StorageServiceInterface;
use Illuminate\Database\Eloquent\Casts\Attribute;

trait FileAttribute
{
    /**
     * Public URL to the stored file (e.g. for img src).
     */
    protected function url(): Attribute
    {
        return Attribute::make(
            get: fn (): string => app(StorageServiceInterface::class)->url($this->disk, $this->path),
        );
    }
}

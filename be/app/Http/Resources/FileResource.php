<?php

namespace App\Http\Resources;

use App\Models\File;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin File
 *
 * @property int $id
 * @property int|null $user_id
 * @property string $disk
 * @property string $file_name
 * @property string $original_name
 * @property string $mime_type
 * @property int $size
 * @property string $path
 * @property-read string $url
 * @property string|null $alt_text
 */
class FileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'disk' => $this->disk,
            'file_name' => $this->file_name,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size' => $this->size,
            'path' => $this->path,
            'url' => $this->url,
            'alt_text' => $this->alt_text,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}

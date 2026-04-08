<?php

namespace App\Models;

use App\Models\Traits\Attribute\FileAttribute;
use App\Models\Traits\Relationship\FileRelationship;
use App\Models\Traits\Scope\FileScope;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property-read string $url
 */
class File extends Model
{
    use FileAttribute, FileRelationship, FileScope, HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'disk',
        'file_name',
        'original_name',
        'mime_type',
        'size',
        'path',
        'alt_text',
    ];

    protected $appends = [
        'url',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'size' => 'integer',
        ];
    }
}

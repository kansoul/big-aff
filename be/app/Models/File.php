<?php

namespace App\Models;

use App\Models\Traits\Relationship\FileRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class File extends Model
{
    use FileRelationship, HasFactory, SoftDeletes;

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

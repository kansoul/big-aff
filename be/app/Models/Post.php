<?php

namespace App\Models;

use App\Enums\PostStatus;
use App\Enums\PostType;
use App\Models\Traits\Relationship\PostRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use HasFactory, PostRelationship, SoftDeletes;

    protected $fillable = [
        'title',
        'slug',
        'lang',
        'note',
        'description',
        'content',
        'feature_media_id',
        'status',
        'is_hidden',
        'type',
        'category_id',
        'created_by',
        'updated_by',
        'published_at',
        'updated_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_hidden' => 'boolean',
            'status' => PostStatus::class,
            'type' => PostType::class,
            'published_at' => 'datetime',
        ];
    }
}

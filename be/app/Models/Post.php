<?php

namespace App\Models;

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
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_hidden' => 'boolean',
            'published_at' => 'datetime',
        ];
    }
}

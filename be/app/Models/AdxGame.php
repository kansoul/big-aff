<?php

namespace App\Models;

use App\Models\Traits\Relationship\Adx\AdxGameRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdxGame extends Model
{
    use AdxGameRelationship, HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'thumbnail',
        'description',
        'game_url',
        'status',
        'sort_order',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }
}

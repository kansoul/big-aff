<?php

namespace App\Models;

use App\Models\Traits\Relationship\AdsLinkRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AdsLink extends Model
{
    use AdsLinkRelationship, HasFactory, SoftDeletes;

    protected $fillable = [
        'site_id',
        'post_id',
        'slug',
        'rac',
        'note',
        'is_hidden',
        'channel_code',
        'style_code',
        'keyword_set_id',
        'tracking_ids',
        'is_old',
        'created_by',
        'updated_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'tracking_ids' => 'array',
            'is_hidden' => 'boolean',
            'is_old' => 'boolean',
        ];
    }
}

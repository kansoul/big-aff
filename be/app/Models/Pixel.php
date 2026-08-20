<?php

namespace App\Models;

use App\Enums\PixelPlatform;
use App\Enums\PixelStatus;
use App\Models\Traits\Relationship\PixelRelationship;
use Database\Factories\PixelFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Pixel extends Model
{
    /** @use HasFactory<PixelFactory> */
    use HasFactory, PixelRelationship, SoftDeletes;

    protected $fillable = [
        'pixel_id',
        'name',
        'platform',
        'business_center_id',
        'status',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'platform' => PixelPlatform::class,
            'status' => PixelStatus::class,
        ];
    }
}

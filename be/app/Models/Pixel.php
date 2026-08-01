<?php

namespace App\Models;

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
        'account_id',
        'pixel_id',
        'name',
        'created_by',
        'updated_by',
    ];
}

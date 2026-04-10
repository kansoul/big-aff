<?php

namespace App\Models;

use App\Models\Traits\Relationship\CategoryRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Category extends Model
{
    use CategoryRelationship, HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'created_by',
        'updated_by',
    ];
}

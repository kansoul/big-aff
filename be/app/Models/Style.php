<?php

namespace App\Models;

use App\Models\Traits\Relationship\StyleRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Style extends Model
{
    use HasFactory, SoftDeletes, StyleRelationship;

    protected $fillable = [
        'code',
        'name',
        'created_by',
        'updated_by',
    ];
}

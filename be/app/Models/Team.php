<?php

namespace App\Models;

use App\Models\Traits\Relationship\TeamRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Team extends Model
{
    use HasFactory, SoftDeletes, TeamRelationship;

    protected $fillable = [
        'name',
        'description',
        'created_by',
        'updated_by',
    ];
}

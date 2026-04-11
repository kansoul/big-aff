<?php

namespace App\Models;

use App\Models\Traits\Relationship\TeamRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Team extends Model
{
    use HasFactory, TeamRelationship;

    protected $fillable = [
        'name',
        'description',
    ];
}

<?php

namespace App\Models;

use App\Models\Traits\Relationship\UserParentChildRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserParentChild extends Model
{
    use HasFactory, UserParentChildRelationship;

    protected $table = 'user_parent_child';

    protected $fillable = [
        'parent_user_id',
        'child_user_id',
    ];
}

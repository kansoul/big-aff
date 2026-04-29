<?php

namespace App\Models;

use App\Models\Traits\Relationship\FollowRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Follow extends Model
{
    use FollowRelationship, HasFactory, SoftDeletes;

    protected $fillable = [
        'email',
        'post_id',
        'style_code',
        'channel_code',
    ];
}

<?php

namespace App\Models;

use App\Models\Traits\Relationship\PostKeywordSetRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\Pivot;

class PostKeywordSet extends Pivot
{
    use HasFactory, PostKeywordSetRelationship;

    protected $table = 'post_keyword_sets';

    public $timestamps = true;

    protected $fillable = [
        'post_id',
        'keyword_set_id',
    ];
}

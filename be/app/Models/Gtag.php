<?php

namespace App\Models;

use App\Models\Traits\Relationship\GtagRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Gtag extends Model
{
    use GtagRelationship, HasFactory;

    protected $fillable = [
        'account_id',
        'code',
        'article_view',
        'rsu_click',
        'search_view',
        'search_click',
    ];
}

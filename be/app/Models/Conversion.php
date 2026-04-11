<?php

namespace App\Models;

use App\Models\Traits\Relationship\ConversionRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Conversion extends Model
{
    use ConversionRelationship, HasFactory;

    protected $fillable = [
        'account_id',
        'article_view',
        'rsu_click',
        'search_view',
        'search_click',
    ];
}

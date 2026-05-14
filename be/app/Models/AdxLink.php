<?php

namespace App\Models;

use App\Models\Traits\Relationship\Adx\AdxLinkRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdxLink extends Model
{
    use AdxLinkRelationship, HasFactory;

    protected $fillable = [
        'adx_game_id',
        'name',
        'landing_url',
        'status',
        'created_by',
        'updated_by',
    ];
}

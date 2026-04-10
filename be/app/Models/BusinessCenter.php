<?php

namespace App\Models;

use App\Models\Traits\Relationship\BusinessCenterRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BusinessCenter extends Model
{
    use BusinessCenterRelationship, HasFactory, SoftDeletes;

    protected $fillable = [
        'bc_id',
        'name',
        'ads_type',
        'team_id',
        'created_by',
        'updated_by',
    ];
}

<?php

namespace App\Models;

use App\Models\Traits\Relationship\AccountRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Account extends Model
{
    use AccountRelationship, HasFactory, SoftDeletes;

    protected $fillable = [
        'business_center_id',
        'team_id',
        'account_id',
        'account_name',
        'ads_type',
        'status',
        'is_special',
        'sync_to_mcc',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'ads_type' => 'string',
        'status' => 'string',
        'sync_to_mcc' => 'boolean',
        'is_special' => 'boolean',
    ];
}

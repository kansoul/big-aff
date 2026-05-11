<?php

namespace App\Models;

use App\Models\Traits\Relationship\Adx\AdxAccountRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AdxAccount extends Model
{
    use AdxAccountRelationship, HasFactory, SoftDeletes;

    protected $fillable = [
        'business_center_id',
        'team_id',
        'main_team_id',
        'source',
        'account_id',
        'account_name',
        'status',
        'is_special',
        'sync_to_mcc',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'main_team_id' => 'integer',
            'is_special' => 'boolean',
            'sync_to_mcc' => 'boolean',
        ];
    }
}

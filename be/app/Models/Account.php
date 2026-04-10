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
        'is_fetch',
        'sync_to_mcc',
        'created_by',
        'updated_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_fetch' => 'boolean',
            'sync_to_mcc' => 'boolean',
        ];
    }
}

<?php

namespace App\Models;

use App\Models\Traits\Method\UserTablePreferenceMethod;
use App\Models\Traits\Relationship\UserTablePreferenceRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserTablePreference extends Model
{
    use HasFactory, UserTablePreferenceMethod, UserTablePreferenceRelationship;

    protected $fillable = [
        'user_id',
        'table_name',
        'toggled_columns',
        'additional_settings',
    ];

    protected function casts(): array
    {
        return [
            'toggled_columns' => 'array',
            'additional_settings' => 'array',
        ];
    }
}

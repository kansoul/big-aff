<?php

namespace App\Models;

use App\Models\Traits\Method\BitwiseMethod;
use App\Models\Traits\Relationship\RoleRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Role extends Model
{
    use BitwiseMethod, HasFactory, RoleRelationship, SoftDeletes;

    protected $fillable = [
        'name',
        'permission_mask',
    ];

    /**
     * @var array<int, string>
     */
    protected $bitwiseFields = ['permission_mask'];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'permission_mask' => 'integer',
        ];
    }
}

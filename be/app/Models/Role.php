<?php

namespace App\Models;

use App\Enums\Permission;
use App\Models\Traits\Relationship\RoleRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Role extends Model
{
    use HasFactory, RoleRelationship, SoftDeletes;

    protected $fillable = [
        'name',
        'permissions',
    ];

    /**
     * Decode the bitwise mask into permission slug strings.
     *
     * @return list<string>
     */
    public function getPermissionSlugs(): array
    {
        return Permission::maskToSlugs($this->permissions ?? '0');
    }

    /**
     * Encode slug strings into a bitwise mask and persist.
     *
     * @param  list<string>  $slugs
     */
    public function syncPermissionSlugs(array $slugs): void
    {
        $this->update([
            'permissions' => Permission::slugsToMask($slugs),
        ]);
    }

    public function getPermissionMask(): string
    {
        return $this->permissions ?? '0';
    }
}

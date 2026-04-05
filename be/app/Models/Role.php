<?php

namespace App\Models;

use App\Models\Traits\Relationship\RoleRelationship;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Role extends Model
{
    use HasFactory, RoleRelationship, SoftDeletes;

    protected $fillable = [
        'name',
    ];

    /**
     * @return list<string>
     */
    public function getPermissionSlugs(): array
    {
        if ($this->relationLoaded('rolePermissions')) {
            return $this->rolePermissions
                ->pluck('permission')
                ->unique()
                ->sort()
                ->values()
                ->all();
        }

        return $this->rolePermissions()
            ->pluck('permission')
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    /**
     * @param  list<string>  $slugs
     */
    public function syncPermissionSlugs(array $slugs): void
    {
        $unique = array_values(array_unique(array_values(array_filter($slugs))));

        $this->rolePermissions()->delete();

        foreach ($unique as $slug) {
            $this->rolePermissions()->create(['permission' => $slug]);
        }
    }
}

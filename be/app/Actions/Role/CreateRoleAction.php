<?php

namespace App\Actions\Role;

use App\Models\Role;
use Illuminate\Support\Facades\DB;

class CreateRoleAction
{
    /**
     * @param  array{name: string, permissions?: list<string>}  $data
     */
    public function execute(array $data): Role
    {
        $permissions = $data['permissions'] ?? [];
        unset($data['permissions']);

        return DB::transaction(function () use ($data, $permissions) {
            $role = Role::query()->create($data);

            if ($permissions !== []) {
                $role->syncPermissionSlugs($permissions);
            }

            return $role->fresh(['rolePermissions']);
        });
    }
}

<?php

namespace App\Actions\Role;

use App\Models\Role;
use Illuminate\Support\Facades\DB;

class UpdateRoleAction
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Role $role, array $data): Role
    {
        DB::transaction(function () use ($role, &$data) {
            if (array_key_exists('permissions', $data)) {
                $role->syncPermissionSlugs($data['permissions']);
                unset($data['permissions']);
            }

            if ($data !== []) {
                $role->update($data);
            }
        });

        return $role->fresh(['rolePermissions']);
    }
}

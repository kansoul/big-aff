<?php

namespace App\Actions\Role;

use App\Enums\Permission;
use App\Models\Role;
use Illuminate\Support\Facades\Auth;
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

        if ($permissions !== []) {
            $data['permissions'] = Permission::slugsToMask($permissions);
        }

        $data['created_by'] = Auth::id();

        return DB::transaction(static fn () => Role::query()->create($data));
    }
}

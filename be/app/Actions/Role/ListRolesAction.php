<?php

namespace App\Actions\Role;

use App\Models\Role;
use Illuminate\Database\Eloquent\Collection;

class ListRolesAction
{
    /**
     * @return Collection<int, Role>
     */
    public function execute(): Collection
    {
        return Role::query()
            ->with('rolePermissions')
            ->orderBy('name')
            ->get();
    }
}

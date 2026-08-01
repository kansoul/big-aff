<?php

namespace Database\Seeders;

use App\Enums\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

/**
 * CreateRoleAdminSeeder class
 */
class CreateRoleAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $role = Role::query()->firstOrCreate(
            ['name' => 'Admin'],
            ['permissions' => Permission::FULL_ACCESS_SENTINEL],
        );

        $this->command->info("Role \"{$role->name}\" created successfully! id: {$role->id}");
    }
}

<?php

namespace Database\Seeders;

use App\Enums\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * CreateUserSeeder class
 */
class CreateUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminRole = Role::query()->firstOrCreate(
            ['name' => 'admin'],
            [
                'name' => 'admin',
                'permissions' => (string) Permission::fullMask(),
            ],
        );

        if ($adminRole->wasRecentlyCreated === false) {
            $adminRole->update(['permissions' => (string) Permission::fullMask()]);
        }

        User::create([
            'name' => 'Test User',
            'email' => 'admin@example.com',
            'password' => Hash::make('123'),
            'role_id' => $adminRole->id,
        ]);
    }
}

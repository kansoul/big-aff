<?php

namespace Tests\Feature;

use App\Enums\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\UserParentChild;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private function fullAccessRole(): Role
    {
        $role = Role::query()->create(['name' => 'admin']);
        $role->syncPermissionSlugs(Permission::values());

        return $role->fresh();
    }

    private function roleWithPermissions(Permission ...$permissions): Role
    {
        $role = Role::query()->create(['name' => 'user']);
        $role->syncPermissionSlugs(array_map(static fn (Permission $p) => $p->value, $permissions));

        return $role->fresh();
    }

    public function test_guest_cannot_list_users(): void
    {
        $this->getJson('/api/users')->assertUnauthorized();
    }

    public function test_full_access_user_can_list_users(): void
    {
        $role = $this->fullAccessRole();
        $user = User::factory()->create(['role_id' => $role->id]);

        Sanctum::actingAs($user);

        $this->getJson('/api/users')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_subtree_user_only_sees_descendants_and_self(): void
    {
        $role = $this->roleWithPermissions(
            Permission::SettingsUsersView,
            Permission::SettingsUsersCreate,
            Permission::SettingsUsersUpdate,
            Permission::SettingsUsersDelete,
        );

        $parent = User::factory()->create(['role_id' => $role->id]);
        $child = User::factory()->create(['role_id' => $role->id]);
        UserParentChild::query()->create([
            'parent_user_id' => $parent->id,
            'child_user_id' => $child->id,
        ]);
        $stranger = User::factory()->create(['role_id' => $role->id]);

        Sanctum::actingAs($parent);

        $ids = collect($this->getJson('/api/users')->json('data'))->pluck('id')->all();

        $this->assertContains($parent->id, $ids);
        $this->assertContains($child->id, $ids);
        $this->assertNotContains($stranger->id, $ids);
    }

    public function test_full_access_user_can_create_user_with_parent(): void
    {
        $role = $this->fullAccessRole();
        $admin = User::factory()->create(['role_id' => $role->id]);
        $childRole = Role::query()->create(['name' => 'editor']);

        Sanctum::actingAs($admin);

        $this->postJson('/api/users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'password123',
            'role_id' => $childRole->id,
            'parent_id' => $admin->id,
        ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'newuser@example.com')
            ->assertJsonPath('data.parent_id', $admin->id);
    }

    public function test_user_cannot_delete_self(): void
    {
        $role = $this->fullAccessRole();
        $user = User::factory()->create(['role_id' => $role->id]);

        Sanctum::actingAs($user);

        $this->deleteJson('/api/users/'.$user->id)->assertForbidden();
    }
}

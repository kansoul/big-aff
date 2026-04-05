<?php

namespace Tests\Feature;

use App\Enums\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoleManagementTest extends TestCase
{
    use RefreshDatabase;

    private function fullAccessRole(): Role
    {
        $role = Role::query()->create(['name' => 'admin']);
        $role->syncPermissionSlugs(Permission::values());

        return $role->fresh(['rolePermissions']);
    }

    public function test_guest_cannot_list_roles(): void
    {
        $this->getJson('/api/roles')->assertUnauthorized();
    }

    public function test_authorized_user_can_create_and_update_role(): void
    {
        $admin = User::factory()->create(['role_id' => $this->fullAccessRole()->id]);

        Sanctum::actingAs($admin);

        $createResponse = $this->postJson('/api/roles', [
            'name' => 'editor',
            'permissions' => [Permission::SettingsUsersView->value],
        ]);

        $createResponse
            ->assertCreated()
            ->assertJsonPath('data.name', 'editor')
            ->assertJsonPath('data.permissions', [Permission::SettingsUsersView->value]);

        $roleId = (int) $createResponse->json('data.id');

        $this->patchJson('/api/roles/'.$roleId, [
            'name' => 'editor-updated',
            'permissions' => [Permission::SettingsUsersUpdate->value],
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'editor-updated')
            ->assertJsonPath('data.permissions', [Permission::SettingsUsersUpdate->value]);
    }

    public function test_cannot_delete_role_that_is_still_assigned_to_users(): void
    {
        $admin = User::factory()->create(['role_id' => $this->fullAccessRole()->id]);
        $role = Role::query()->create(['name' => 'staff']);
        User::factory()->create(['role_id' => $role->id]);

        Sanctum::actingAs($admin);

        $this->deleteJson('/api/roles/'.$role->id)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('role');

        $this->assertModelExists($role);
    }

    public function test_can_delete_unassigned_role(): void
    {
        $admin = User::factory()->create(['role_id' => $this->fullAccessRole()->id]);
        $role = Role::query()->create(['name' => 'temporary-role']);

        Sanctum::actingAs($admin);

        $this->deleteJson('/api/roles/'.$role->id)
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertSoftDeleted('roles', ['id' => $role->id]);
    }
}

<?php

namespace Tests\Feature;

use App\Enums\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\UserParentChild;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserParentChildTest extends TestCase
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
        $role = Role::query()->create(['name' => 'manage']);
        $role->syncPermissionSlugs(array_map(static fn (Permission $p) => $p->value, $permissions));

        return $role->fresh();
    }

    public function test_guest_cannot_list_parent_child_assignments(): void
    {
        $this->getJson('/api/users/parent-child-assignments')->assertUnauthorized();
    }

    public function test_authorized_user_receives_assignments_payload(): void
    {
        $role = $this->fullAccessRole();
        $admin = User::factory()->create(['role_id' => $role->id]);
        $u1 = User::factory()->create(['role_id' => $role->id]);
        $u2 = User::factory()->create(['role_id' => $role->id]);

        UserParentChild::query()->create([
            'parent_user_id' => $u1->id,
            'child_user_id' => $u2->id,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/users/parent-child-assignments')
            ->assertOk()
            ->assertJsonPath('success', true);

        $assignments = collect($response->json('data.assignments'));
        $rowU1 = $assignments->firstWhere('id', $u1->id);
        $rowU2 = $assignments->firstWhere('id', $u2->id);

        $this->assertNotNull($rowU1);
        $this->assertNull($rowU2);
        $this->assertTrue($rowU1['can_be_parent']);
        $this->assertContains($u2->id, $rowU1['child_user_ids']);

        $u2Option = collect($response->json('data.user_options'))->firstWhere('id', $u2->id);
        $this->assertNotNull($u2Option);
        $this->assertTrue($u2Option['is_assigned_child']);
    }

    public function test_child_user_cannot_be_given_children(): void
    {
        $role = $this->fullAccessRole();
        $admin = User::factory()->create(['role_id' => $role->id]);
        $parent = User::factory()->create(['role_id' => $role->id]);
        $child = User::factory()->create(['role_id' => $role->id]);
        $other = User::factory()->create(['role_id' => $role->id]);

        UserParentChild::query()->create([
            'parent_user_id' => $parent->id,
            'child_user_id' => $child->id,
        ]);

        Sanctum::actingAs($admin);

        $this->putJson('/api/users/'.$child->id.'/parent-children', [
            'child_ids' => [$other->id],
        ])->assertStatus(422);
    }

    public function test_parent_cannot_be_assigned_as_child_without_clearing_children_first(): void
    {
        $role = $this->fullAccessRole();
        $admin = User::factory()->create(['role_id' => $role->id]);
        $p1 = User::factory()->create(['role_id' => $role->id]);
        $c1 = User::factory()->create(['role_id' => $role->id]);
        $p2 = User::factory()->create(['role_id' => $role->id]);

        UserParentChild::query()->create([
            'parent_user_id' => $p1->id,
            'child_user_id' => $c1->id,
        ]);

        Sanctum::actingAs($admin);

        $this->putJson('/api/users/'.$p2->id.'/parent-children', [
            'child_ids' => [$p1->id],
        ])->assertStatus(422);
    }

    public function test_null_child_ids_clears_parent_children(): void
    {
        $role = $this->fullAccessRole();
        $admin = User::factory()->create(['role_id' => $role->id]);
        $parent = User::factory()->create(['role_id' => $role->id]);
        $child = User::factory()->create(['role_id' => $role->id]);

        UserParentChild::query()->create([
            'parent_user_id' => $parent->id,
            'child_user_id' => $child->id,
        ]);

        Sanctum::actingAs($admin);

        $this->putJson('/api/users/'.$parent->id.'/parent-children', [
            'child_ids' => null,
        ])->assertOk();

        $this->assertDatabaseMissing('user_parent_child', [
            'parent_user_id' => $parent->id,
            'child_user_id' => $child->id,
        ]);
    }

    public function test_sync_moves_child_from_previous_parent(): void
    {
        $role = $this->fullAccessRole();
        $admin = User::factory()->create(['role_id' => $role->id]);
        $p1 = User::factory()->create(['role_id' => $role->id]);
        $p2 = User::factory()->create(['role_id' => $role->id]);
        $c1 = User::factory()->create(['role_id' => $role->id]);

        UserParentChild::query()->create([
            'parent_user_id' => $p1->id,
            'child_user_id' => $c1->id,
        ]);

        Sanctum::actingAs($admin);

        $this->putJson('/api/users/'.$p2->id.'/parent-children', [
            'child_ids' => [$c1->id],
        ])->assertOk();

        $this->assertDatabaseMissing('user_parent_child', [
            'parent_user_id' => $p1->id,
            'child_user_id' => $c1->id,
        ]);
        $this->assertDatabaseHas('user_parent_child', [
            'parent_user_id' => $p2->id,
            'child_user_id' => $c1->id,
        ]);
    }

    public function test_subtree_actor_cannot_assign_outside_scope(): void
    {
        $role = $this->roleWithPermissions(
            Permission::SettingsUsersView,
            Permission::SettingsUsersUpdate,
        );

        $manager = User::factory()->create(['role_id' => $role->id]);
        $sub = User::factory()->create(['role_id' => $role->id]);
        UserParentChild::query()->create([
            'parent_user_id' => $manager->id,
            'child_user_id' => $sub->id,
        ]);
        $stranger = User::factory()->create(['role_id' => $role->id]);

        Sanctum::actingAs($manager);

        $this->putJson('/api/users/'.$manager->id.'/parent-children', [
            'child_ids' => [$stranger->id],
        ])->assertStatus(422);
    }
}

<?php

namespace Tests\Feature;

use App\Enums\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdsDeliveryEntitiesTest extends TestCase
{
    use RefreshDatabase;

    private function roleWithPermissions(Permission ...$permissions): Role
    {
        $role = Role::query()->create(['name' => 'delivery-viewer']);
        $role->syncPermissionSlugs(array_map(static fn (Permission $p) => $p->value, $permissions));

        return $role->fresh();
    }

    public function test_guest_cannot_fetch_delivery_entity_status_options(): void
    {
        $this->getJson('/api/campaign-reports/delivery-entities-reports/status-options')
            ->assertUnauthorized();
    }

    public function test_authorized_user_receives_status_options(): void
    {
        $role = $this->roleWithPermissions(Permission::DeliveryEntitiesReportsView);
        $user = User::factory()->create(['role_id' => $role->id]);

        Sanctum::actingAs($user);

        $this->getJson('/api/campaign-reports/delivery-entities-reports/status-options')
            ->assertOk()
            ->assertJsonPath('data.statuses.0.value', 'ACTIVE')
            ->assertJsonPath('data.statuses.0.label', 'Active');
    }
}

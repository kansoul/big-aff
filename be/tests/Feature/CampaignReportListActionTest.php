<?php

namespace Tests\Feature;

use App\Actions\CampaignReport\ListCampaignReportsAction;
use App\Enums\Permission;
use App\Enums\TeamRole;
use App\Models\Account;
use App\Models\CampaignReport;
use App\Models\Role;
use App\Models\Team;
use App\Models\TeamUser;
use App\Models\User;
use App\Models\UserParentChild;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CampaignReportListActionTest extends TestCase
{
    use RefreshDatabase;

    private function fullAccessRole(): Role
    {
        $role = Role::query()->create(['name' => 'admin']);
        $role->syncPermissionSlugs(Permission::values());

        return $role->fresh();
    }

    private function reportRole(): Role
    {
        $role = Role::query()->create(['name' => 'reports']);
        $role->syncPermissionSlugs([Permission::CampaignReportsView->value]);

        return $role->fresh();
    }

    public function test_admin_can_filter_campaign_reports_by_user(): void
    {
        $admin = User::factory()->create(['role_id' => $this->fullAccessRole()->id]);
        $userOne = User::factory()->create(['role_id' => $this->reportRole()->id]);
        $userTwo = User::factory()->create(['role_id' => $this->reportRole()->id]);

        $this->createReportForUser($userOne, 'camp-user-one');
        $this->createReportForUser($userTwo, 'camp-user-two');

        $this->actingAs($admin);

        $campaignIds = $this->campaignIdsForFilters(['user_ids' => [$userTwo->id]]);

        $this->assertSame(['camp-user-two'], $campaignIds);
    }

    public function test_manager_filter_is_limited_to_managed_team_users(): void
    {
        $role = $this->reportRole();
        $manager = User::factory()->create(['role_id' => $role->id]);
        $member = User::factory()->create(['role_id' => $role->id]);
        $stranger = User::factory()->create(['role_id' => $role->id]);
        $team = Team::factory()->create(['created_by' => $manager->id]);

        TeamUser::query()->create([
            'team_id' => $team->id,
            'user_id' => $manager->id,
            'joined_at' => now(),
            'team_role' => TeamRole::MANAGER->value,
            'single_team_key' => null,
        ]);
        TeamUser::query()->create([
            'team_id' => $team->id,
            'user_id' => $member->id,
            'joined_at' => now(),
            'team_role' => TeamRole::MEMBER->value,
            'single_team_key' => (string) $member->id,
        ]);

        $this->createReportForUser($member, 'camp-member');
        $this->createReportForUser($stranger, 'camp-stranger');

        $this->actingAs($manager);

        $campaignIds = $this->campaignIdsForFilters(['user_ids' => [$member->id, $stranger->id]]);

        $this->assertSame(['camp-member'], $campaignIds);
    }

    public function test_leader_filter_is_limited_to_child_users(): void
    {
        $role = $this->reportRole();
        $leader = User::factory()->create(['role_id' => $role->id]);
        $child = User::factory()->create(['role_id' => $role->id]);
        $stranger = User::factory()->create(['role_id' => $role->id]);

        UserParentChild::query()->create([
            'parent_user_id' => $leader->id,
            'child_user_id' => $child->id,
        ]);

        $this->createReportForUser($child, 'camp-child');
        $this->createReportForUser($stranger, 'camp-stranger');

        $this->actingAs($leader);

        $campaignIds = $this->campaignIdsForFilters(['user_ids' => [$child->id, $stranger->id]]);

        $this->assertSame(['camp-child'], $campaignIds);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<int, string>
     */
    private function campaignIdsForFilters(array $filters): array
    {
        return app(ListCampaignReportsAction::class)
            ->execute($filters)
            ->getCollection()
            ->pluck('campaign_id')
            ->values()
            ->all();
    }

    private function createReportForUser(User $user, string $campaignId): void
    {
        $account = Account::factory()->create();

        DB::table('account_user')->insert([
            'user_id' => $user->id,
            'account_id' => $account->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        CampaignReport::factory()->create([
            'account_id' => $account->account_id,
            'account_name' => $account->account_name,
            'campaign_id' => $campaignId,
            'date_start' => '2026-05-01',
        ]);
    }
}

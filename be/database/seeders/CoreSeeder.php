<?php

namespace Database\Seeders;

use App\Enums\Permission;
use App\Enums\TeamRole;
use App\Models\Role;
use App\Models\Team;
use App\Models\User;
use App\Models\UserParentChild;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CoreSeeder extends Seeder
{
    public function run(): void
    {
        $managerMask = Permission::RevenueStatsView->bit()
            | Permission::RevenueReportsView->bit()
            | Permission::RevenueChartReportsView->bit()
            | Permission::CampaignReportsView->bit()
            | Permission::AnalyticsTrackingView->bit()
            | Permission::AdsReportView->bit()
            | Permission::StyleReportRangeView->bit();

        $managerRole = Role::query()->firstOrCreate(
            ['name' => 'manager'],
            [
                'permissions' => (string) $managerMask,
                'created_by' => 1,
            ],
        );

        $analystMask = Permission::AnalyticsTrackingView->bit()
            | Permission::AdsReportView->bit()
            | Permission::CampaignReportsView->bit();

        $analystRole = Role::query()->firstOrCreate(
            ['name' => 'analyst'],
            [
                'permissions' => (string) $analystMask,
                'created_by' => 1,
            ],
        );

        $manager1 = User::query()->firstOrCreate(
            ['email' => 'manager1@example.com'],
            [
                'name' => 'Manager One',
                'password' => Hash::make('password'),
                'role_id' => $managerRole->id,
                'created_by' => 1,
            ],
        );

        $manager2 = User::query()->firstOrCreate(
            ['email' => 'manager2@example.com'],
            [
                'name' => 'Manager Two',
                'password' => Hash::make('password'),
                'role_id' => $managerRole->id,
                'created_by' => 1,
            ],
        );

        $analyst = User::query()->firstOrCreate(
            ['email' => 'analyst@example.com'],
            [
                'name' => 'Analyst',
                'password' => Hash::make('password'),
                'role_id' => $analystRole->id,
                'created_by' => 1,
            ],
        );

        // Ownership tree: admin owns manager1/2, manager1 owns analyst (sample hierarchy)
        UserParentChild::query()->firstOrCreate([
            'parent_user_id' => 1,
            'child_user_id' => $manager1->id,
        ]);
        UserParentChild::query()->firstOrCreate([
            'parent_user_id' => 1,
            'child_user_id' => $manager2->id,
        ]);
        UserParentChild::query()->firstOrCreate([
            'parent_user_id' => $manager1->id,
            'child_user_id' => $analyst->id,
        ]);

        $team1 = Team::query()->firstOrCreate(
            ['name' => 'Alpha Team'],
            [
                'description' => 'Seed team Alpha',
                'created_by' => 1,
            ],
        );
        $team2 = Team::query()->firstOrCreate(
            ['name' => 'Beta Team'],
            [
                'description' => 'Seed team Beta',
                'created_by' => 1,
            ],
        );

        $this->attachUserToTeam($team1, $manager1, TeamRole::MANAGER);
        $this->attachUserToTeam($team2, $manager2, TeamRole::MANAGER);

        // Regular members (single-team constraint)
        $memberRole = Role::query()->firstOrCreate(
            ['name' => 'member'],
            ['permissions' => '0', 'created_by' => 1],
        );

        $members = User::factory()
            ->count(6)
            ->create([
                'role_id' => $memberRole->id,
                'created_by' => 1,
            ]);

        foreach ($members->take(3) as $member) {
            $this->attachUserToTeam($team1, $member, TeamRole::MEMBER);
        }

        foreach ($members->skip(3) as $member) {
            $this->attachUserToTeam($team2, $member, TeamRole::MEMBER);
        }
    }

    private function attachUserToTeam(Team $team, User $user, TeamRole $role): void
    {
        $team->users()->syncWithoutDetaching([
            $user->id => [
                'team_role' => $role->value,
                'joined_at' => now(),
                'single_team_key' => $role === TeamRole::MANAGER ? null : $user->id,
            ],
        ]);
    }
}

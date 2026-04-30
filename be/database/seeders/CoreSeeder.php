<?php

namespace Database\Seeders;

use App\Enums\Permission;
use App\Enums\TeamRole;
use App\Models\Role;
use App\Models\Team;
use App\Models\User;
use App\Models\UserParentChild;
use App\Models\UserTablePreference;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds the core identity graph:
 *   - Admin role + admin user (admin@example.com)
 *   - Manager / Analyst (leader) / Member roles
 *   - Two managers, one leader per team (Alpha: analyst@, Beta: leader2@example.com), six members
 *   - `user_parent_child`: only team members as children of their team's leader (same team)
 *   - Teams + `team_user` pivot (respecting the single-team constraint for leader/member)
 *   - Default `user_table_preferences` rows for admin + managers + leaders
 *
 * CreateRoleAdminSeeder also creates the Admin role; this seeder is defensive and calls
 * firstOrCreate so it stays idempotent whether or not CreateRoleAdminSeeder ran first.
 */
class CoreSeeder extends Seeder
{
    private const ADMIN_EMAIL = 'admin@example.com';

    public function run(): void
    {
        $adminRole = $this->ensureAdminRole();
        $admin = $this->ensureAdminUser($adminRole);

        $managerRole = $this->buildManagerRole($admin);
        $analystRole = $this->buildAnalystRole($admin);
        $memberRole = $this->buildMemberRole($admin);

        [$manager1, $manager2, $leaderTeam1] = $this->seedKeyUsers($admin, $managerRole, $analystRole);
        $leaderTeam2 = $this->ensureLeaderTeam2($admin, $analystRole);

        [$team1, $team2] = $this->seedTeams($admin);
        $this->attachUserToTeam($team1, $manager1, TeamRole::MANAGER);
        $this->attachUserToTeam($team2, $manager2, TeamRole::MANAGER);
        $this->attachUserToTeam($team1, $leaderTeam1, TeamRole::LEADER);
        $this->attachUserToTeam($team2, $leaderTeam2, TeamRole::LEADER);

        $members = $this->seedMembers($admin, $memberRole);
        $membersTeam1 = $members->take(3)->values();
        $membersTeam2 = $members->skip(3)->values();

        foreach ($membersTeam1 as $member) {
            $this->attachUserToTeam($team1, $member, TeamRole::MEMBER);
        }
        foreach ($membersTeam2 as $member) {
            $this->attachUserToTeam($team2, $member, TeamRole::MEMBER);
        }

        $this->seedMemberToLeaderParentChild($leaderTeam1, $membersTeam1, $leaderTeam2, $membersTeam2);

        $this->seedUserTablePreferences(
            User::query()->whereIn('email', [
                self::ADMIN_EMAIL,
                $manager1->email,
                $manager2->email,
                $leaderTeam1->email,
                $leaderTeam2->email,
            ])->get(),
        );
    }

    private function ensureAdminRole(): Role
    {
        return Role::query()->firstOrCreate(
            ['name' => 'Admin'],
            ['permissions' => Permission::FULL_ACCESS_SENTINEL],
        );
    }

    private function ensureAdminUser(Role $adminRole): User
    {
        return User::query()->firstOrCreate(
            ['email' => self::ADMIN_EMAIL],
            [
                'name' => 'Admin',
                'password' => Hash::make('password'),
                'role_id' => $adminRole->id,
            ],
        );
    }

    private function buildManagerRole(User $admin): Role
    {
        return Role::query()->firstOrCreate(
            ['name' => 'manager'],
            [
                'permissions' => Permission::slugsToMask([
                    Permission::RevenueStatsView->value,
                    Permission::RevenueReportsView->value,
                    Permission::RevenueChartReportsView->value,
                    Permission::CampaignReportsView->value,
                    Permission::AnalyticsTrackingView->value,
                    Permission::AdsReportView->value,
                    Permission::AccountsView->value,
                    Permission::CampaignsView->value,
                    Permission::ChannelsView->value,
                    Permission::TeamsView->value,
                ]),
                'created_by' => $admin->id,
            ],
        );
    }

    private function buildAnalystRole(User $admin): Role
    {
        return Role::query()->firstOrCreate(
            ['name' => 'analyst'],
            [
                'permissions' => Permission::slugsToMask([
                    Permission::AnalyticsTrackingView->value,
                    Permission::AdsReportView->value,
                    Permission::CampaignReportsView->value,
                    Permission::RevenueReportsView->value,
                ]),
                'created_by' => $admin->id,
            ],
        );
    }

    private function buildMemberRole(User $admin): Role
    {
        return Role::query()->firstOrCreate(
            ['name' => 'member'],
            ['permissions' => '0', 'created_by' => $admin->id],
        );
    }

    /**
     * @return array{0: User, 1: User, 2: User}
     */
    private function seedKeyUsers(User $admin, Role $managerRole, Role $analystRole): array
    {
        $manager1 = User::query()->firstOrCreate(
            ['email' => 'manager1@example.com'],
            [
                'name' => 'Manager One',
                'password' => Hash::make('password'),
                'role_id' => $managerRole->id,
                'created_by' => $admin->id,
            ],
        );

        $manager2 = User::query()->firstOrCreate(
            ['email' => 'manager2@example.com'],
            [
                'name' => 'Manager Two',
                'password' => Hash::make('password'),
                'role_id' => $managerRole->id,
                'created_by' => $admin->id,
            ],
        );

        $leaderTeam1 = User::query()->firstOrCreate(
            ['email' => 'analyst@example.com'],
            [
                'name' => 'Leader Alpha',
                'password' => Hash::make('password'),
                'role_id' => $analystRole->id,
                'created_by' => $admin->id,
            ],
        );

        return [$manager1, $manager2, $leaderTeam1];
    }

    /**
     * Second team needs its own leader (leader/member may only belong to one team).
     */
    private function ensureLeaderTeam2(User $admin, Role $analystRole): User
    {
        return User::query()->firstOrCreate(
            ['email' => 'leader2@example.com'],
            [
                'name' => 'Leader Beta',
                'password' => Hash::make('password'),
                'role_id' => $analystRole->id,
                'created_by' => $admin->id,
            ],
        );
    }

    /**
     * Only members in a team are children of that team's leader in `user_parent_child`.
     *
     * @param  Collection<int, User>  $membersTeam1
     * @param  Collection<int, User>  $membersTeam2
     */
    private function seedMemberToLeaderParentChild(
        User $leaderTeam1,
        Collection $membersTeam1,
        User $leaderTeam2,
        Collection $membersTeam2,
    ): void {
        $legacyParentIds = User::query()
            ->whereIn('email', [
                self::ADMIN_EMAIL,
                'manager1@example.com',
                'manager2@example.com',
            ])
            ->pluck('id');

        UserParentChild::query()->whereIn('parent_user_id', $legacyParentIds)->delete();

        foreach ($membersTeam1 as $member) {
            UserParentChild::query()->firstOrCreate([
                'parent_user_id' => $leaderTeam1->id,
                'child_user_id' => $member->id,
            ]);
        }

        foreach ($membersTeam2 as $member) {
            UserParentChild::query()->firstOrCreate([
                'parent_user_id' => $leaderTeam2->id,
                'child_user_id' => $member->id,
            ]);
        }
    }

    /**
     * @return array{0: Team, 1: Team}
     */
    private function seedTeams(User $admin): array
    {
        $team1 = Team::query()->firstOrCreate(
            ['name' => 'Alpha Team'],
            [
                'description' => 'Seed team Alpha',
                'created_by' => $admin->id,
            ],
        );

        $team2 = Team::query()->firstOrCreate(
            ['name' => 'Beta Team'],
            [
                'description' => 'Seed team Beta',
                'created_by' => $admin->id,
            ],
        );

        return [$team1, $team2];
    }

    /**
     * @return Collection<int, User>
     */
    private function seedMembers(User $admin, Role $memberRole): Collection
    {
        $existing = User::query()
            ->where('role_id', $memberRole->id)
            ->where('created_by', $admin->id)
            ->get();

        if ($existing->count() >= 6) {
            return $existing->take(6)->values();
        }

        $toCreate = 6 - $existing->count();

        $created = User::factory()
            ->count($toCreate)
            ->create([
                'role_id' => $memberRole->id,
                'created_by' => $admin->id,
            ]);

        return $existing->concat($created)->values();
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

    /**
     * @param  Collection<int, User>  $users
     */
    private function seedUserTablePreferences(Collection $users): void
    {
        $tables = ['campaign-reports', 'revenue-reports', 'style-report-range'];

        foreach ($users as $user) {
            foreach ($tables as $tableName) {
                UserTablePreference::query()->firstOrCreate(
                    ['user_id' => $user->id, 'table_name' => $tableName],
                    [
                        'toggled_columns' => [],
                        'additional_settings' => [],
                    ],
                );
            }
        }
    }
}
